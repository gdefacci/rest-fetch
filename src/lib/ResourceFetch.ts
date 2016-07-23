import {JsMap, Option, Arrays, isNull} from "flib"
import {Try, Success, Failure} from "./Try"
import {ObjectsCache, newObjectsCache} from"./ObjectsCache"
import {JsConstructor, ObjectValue  , ChoiceValue  , Value, ValuePredicate, ExtraPropertiesStrategy, RawValue, RawValueNT} from"./model"

function getJsonValue<T>(v: any, desc: string, predicate: (a: any) => boolean): Try<T> {
  if (isNull(v)) return new Failure(new Error("null"))
  else if (!predicate(v)) return new Failure(new Error(`${JSON.stringify(v)} is not $desc`))
  else return new Success<T>(v)
}

function getJsonProperty(json: any, name: string): Try<any> {
  return (json === undefined || typeof json !== "object") ?
    new Failure(new Error(`error while reading Value ${name}, expecting an object got ${JSON.stringify(json)}`)) :
    new Success(json[name])
}

class InterpreterResult {
  static empty = new InterpreterResult([])
  static merge(ress:InterpreterResult[]):InterpreterResult {
    return ress.reduce((acc, itm) => acc.add(itm), InterpreterResult.empty)
  }

  constructor(private cycles: Promise<any>[]) {
  }
  private add(p: InterpreterResult) {
    return new InterpreterResult(this.cycles.concat(p.cycles))
  }
  all() {
    return Promise.all(this.cycles)
  }
}

class Context {
  constructor(
    public extraPropertiesStrategy:ExtraPropertiesStrategy,
    public httpFetch: (url: string) => Promise<Option<any>>,
    public objectsCache: ObjectsCache<JsConstructor<any>, Promise<any>>,
    public setValue: (a: any) => void,
    public url: Option<string>,
    public parentUrl: Option<string>
  ) {
  }

  withUrl(url:string) {
    return new Context(this.extraPropertiesStrategy, this.httpFetch, this.objectsCache, this.setValue, Option.some(url), this.url)
  }
  withoutUrl() {
    return new Context(this.extraPropertiesStrategy, this.httpFetch, this.objectsCache, this.setValue, Option.none<string>(), this.url)
  }
  withSetValue(setValue:(a:any) => void) {
    return new Context(this.extraPropertiesStrategy, this.httpFetch, this.objectsCache, setValue, this.url, this.parentUrl)
  }
}

export class ResourceFetch {
  constructor(private propertiesWithoutMappingStrategy:ExtraPropertiesStrategy, private httpFetchFactory:() => (url:string) => Promise<Option<any>>) {
  }
  fetchResource<T>(url:string, mapping:() => (ObjectValue<T> | ChoiceValue<T>)):Promise<T> {
    const httpFetch = this.httpFetchFactory()
    let result:T= null
    const ctx = new Context(this.propertiesWithoutMappingStrategy,
      httpFetch,
      newObjectsCache<JsConstructor<any>, Promise<any>>(),
      v => result = v,
      Option.none<string>(),Option.none<string>() )

    const ires = JsonIntepreter.instance.interpret(ctx, Value.link(mapping)(), url)

    return ires.then( ires => ires.all().then( v => result ) )
  }
}

function isGetPropertyValue<T>(v:Value<T>) {
  const no = () => false
  const yes = () => true

  return v.fold<boolean>( (item: RawValue<any, any>) => item.fold(no, no, no, yes), no, no, no, no, no);
}

function simpleValue<T,T1>(json:any, typename:string, f:(v:T) => T1, setValue:(a:any) => void) {
  return getJsonValue<T>(json, typename, (a: any) => (typeof a === typename)).fold(
    (err) => Promise.reject(err),
    (v) => {
      setValue(f(v))
      return Promise.resolve(InterpreterResult.empty)
    }
  )
}

class JsonIntepreter {

  static instance = new JsonIntepreter()

  interpret<T>(context:Context, mapping: Value<T>, json: any): Promise<InterpreterResult> {
    return mapping.fold<Promise<InterpreterResult>>(
      <T1>(rawValue:RawValue<any,T1>) => {
        return rawValue.fold(
          (f) => simpleValue<boolean, T1>(json, "boolean", f, context.setValue),
          (f) => simpleValue<number, T1>(json, "number", f, context.setValue),
          (f) => simpleValue<string, T1>(json, "string", f, context.setValue),
          (f) => {
            context.setValue(f(context.parentUrl))
            return Promise.resolve(InterpreterResult.empty)
          }
        )
      },
      (item, notFoundHandler) => {
        if (typeof json === "string") {
          const url = json
          return context.httpFetch(url).then( (json:Option<any>) =>
            json.fold(
              () => {
                context.setValue(notFoundHandler(url))
                return Promise.resolve(InterpreterResult.empty)
              },
              json => this.interpret(context.withUrl(url), item, json))
          );
        } else {
          return Promise.reject(new Error(`${JSON.stringify(json)} is not a url`));
        }
      },
      (jsConstr, props, optExtraPropertiesStrategy) => {

        const cachedObj = context.url.flatMap(url => context.objectsCache.get(url, jsConstr))

        return cachedObj.fold(
          () => {
            const resObj = new jsConstr();
            const res = Promise.resolve(resObj)

            context.url.forEach(url => context.objectsCache.put(url, jsConstr, res))
            context.setValue(resObj)

            const remainingJsonPropertiesSet = JsMap.map(json, (k,v) => true)

            const promisesMap:JsMap<Promise<InterpreterResult>> = JsMap.map(props, (targetProperty, nameProp) => {
              const [sourceProperty, prop] = nameProp
              delete remainingJsonPropertiesSet[sourceProperty];
              return getJsonProperty(json, sourceProperty).fold(
                err => Promise.reject(err),
                (v) => this.interpret(context.withoutUrl().withSetValue(v => resObj[targetProperty] = v), prop, v)
              )
            })

            const extraPropsStrategy = optExtraPropertiesStrategy.getOrElse( () => context.extraPropertiesStrategy )
            switch (extraPropsStrategy) {
              case ExtraPropertiesStrategy.fail:
                if (Object.keys(remainingJsonPropertiesSet).length > 0)
                  return Promise.reject(new Error(`extra properties ${Object.keys(remainingJsonPropertiesSet)} creating object ${jsConstr.name}`))

              case ExtraPropertiesStrategy.copy:
                JsMap.forEach(remainingJsonPropertiesSet, (k,v) => resObj[k] = json[k] )
              case ExtraPropertiesStrategy.discard:
              default:
                const proms = Promise.all(Object.keys(promisesMap).map(k => promisesMap[k]))

                return proms.then( proms => InterpreterResult.merge(proms) );
            }
          },
          (v) => {
            v.then( context.setValue )
            return Promise.resolve( new InterpreterResult([v]) )
          }
        )

      },
      <T1>(item:Value<T1>) => {

        const interpretItem = () => this.interpret(context.withSetValue(v => context.setValue(Option.option(v))), item, json)
        const setNone = () => {
          context.setValue(Option.none())
          return Promise.resolve( InterpreterResult.empty )
        }

        const itemIsGetProperty = isGetPropertyValue(item)
        if (itemIsGetProperty) {
          try {
            return interpretItem()
          } catch (e) {
            return setNone()
          }
        } else if (isNull(json)) {
          return setNone()
        } else {
          return interpretItem()
        }

      },
      <T1>(item:Value<T1>) => {
        if (Array.isArray(json)) {
          const resArray:T[] = []
          context.setValue(resArray)
          const proms:Promise<InterpreterResult>[] = json.map( (i:any, index:number) => {
            return this.interpret(context.withSetValue(v => resArray[index] = v),  item, i)
          })
          return Promise.all( proms ).then( proms => InterpreterResult.merge(proms) )
        } else
          return Promise.reject(new Error(`expecting an array got ${JSON.stringify(json)}`))

      },
      (choices) => {
        if (!isNull(json)) {
          return this.findChoice(context, json, choices)
        } else {
          return Promise.reject(new Error("null"))
        }
      }
    )
  }

  findChoice(context:Context, json:any, choices:ValuePredicate<any>[]):Promise<InterpreterResult> {
    return Arrays.findIndex(choices, choice => choice.predicate(json)).fold(
      () => Promise.reject(new Error(`could find a choice for ${JSON.stringify(json)}`)),
      (idx) => this.interpret(context, choices[idx].value(), json).then(
        v => v,
        err => {
          const nchoices = choices.slice(idx+1)
          return this.findChoice(context, json, nchoices)
        }
      )
    )
  }

}
