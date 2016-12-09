import {JsMap, Option, Arrays, isNull, Try} from "flib"
import {ObjectsCache, newObjectsCache} from"./ObjectsCache"
import {default as httpCacheFactory} from"./httpCacheFactory"
import {JsConstructor, ObjectValue  , ChoiceValue  , Value, ValuePredicate, ExtraPropertiesStrategy, RawValue} from"./model"
import * as HttpConfig from "./HttpConfig"

function getJsonValue<T>(v: any, desc: string, predicate: (a: any) => boolean): Try<T> {
  if (isNull(v)) return Try.failure(new Error("null"))
  else if (!predicate(v)) return Try.failure(new Error(`${JSON.stringify(v)} is not ${desc}`))
  else return Try.success(v)
}

function getJsonProperty(json: any, name: string): Try<any> {
  return (json === undefined || typeof json !== "object") ?
    Try.failure(new Error(`error while reading Value ${name}, expecting an object got ${JSON.stringify(json)}`)) :
    Try.success(json[name])
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
    public httpGet: (url: string) => Promise<Option<any>>,
    public objectsCache: ObjectsCache<JsConstructor<any>, Promise<any>>,
    public setValue: (a: any) => void,
    public url: Option<string>,
    public parentUrl: Option<string>
  ) {
  }

  withUrl(url:string) {
    return new Context(this.extraPropertiesStrategy, this.httpGet, this.objectsCache, this.setValue, Option.some(url), this.url)
  }
  withoutUrl() {
    return new Context(this.extraPropertiesStrategy, this.httpGet, this.objectsCache, this.setValue, Option.None, this.url)
  }
  withSetValue(setValue:(a:any) => void) {
    return new Context(this.extraPropertiesStrategy, this.httpGet, this.objectsCache, setValue, this.url, this.parentUrl)
  }
}

function defaultHttpCacheFactory() {
  return httpCacheFactory(HttpConfig.defaultRequestFactory, HttpConfig.jsonResponseReader)
}

export class ResourceFetch {
  constructor(  private propertiesWithoutMappingStrategy:ExtraPropertiesStrategy = ExtraPropertiesStrategy.copy,
                private httpCacheFactory:() => (url:string) => Promise<Option<any>> = defaultHttpCacheFactory()) {
  }
  fetchResource<T>(url:string, mapping:() => (ObjectValue<T> | ChoiceValue<T>)):Promise<T> {
    return this.fetchRun(url, Value.link(mapping)());
  }
  fetchObject<T>(obj:any, mapping:() => (ObjectValue<T> | ChoiceValue<T>)):Promise<T> {
    return this.fetchRun(obj, mapping());
  }
  private fetchRun<T>(obj:any, mapping:Value<T>):Promise<T> {
    const interpreter = new JsonIntepreter()
    const httpGet = this.httpCacheFactory()
    let result:T
    const ctx = new Context(this.propertiesWithoutMappingStrategy, httpGet, newObjectsCache<JsConstructor<any>, Promise<any>>(), v => result = v, Option.None,Option.None)
    const ires = interpreter.interpret(ctx, mapping, obj)
    return ires.then( ires => ires.all().then( v => result ) )
  }
}

function isGetPropertyValue<T>(v:Value<T>) {
  const no = () => false
  const yes = () => true

  return v.fold<boolean>( (item: RawValue<any, any>) => item.fold(no, no, no, yes), no, no, no, no, no);
}

function simpleValue<T,T1>(json:any, typename:string, f:(v:T) => T1, setValue:(a:any) => void):Promise<InterpreterResult> {
  const tr:Try<T> = getJsonValue<T>(json, typename, (a: any) => (typeof a === typename))
  return tr.fold<Promise<InterpreterResult>>( (err:Error) => Promise.reject(err), (v:T) => {
    setValue(f(v))
    return Promise.resolve<InterpreterResult>(InterpreterResult.empty)
  })
}

function setPropertyValue(a:any, p:string, v:any) {
  try {
    a[p] = v
  } catch(e) {
    /** ignore readonly property errors */
  }
}

class JsonIntepreter {

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
          return context.httpGet(url).then( (json:Option<any>) =>
            json.fold(
              () => {
                try {
                  context.setValue(notFoundHandler(url))
                  return Promise.resolve(InterpreterResult.empty)
                } catch (e) {
                  return Promise.reject(e)
                }
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
            if (!(typeof json === "object"))
              return Promise.reject(new Error(`expecting an object got '${json}' (of type ${typeof json}) creating object ${jsConstr.name}`))

            const resObj = new jsConstr();
            const res = Promise.resolve(resObj)

            context.url.forEach(url => context.objectsCache.put(url, jsConstr, res))
            context.setValue(resObj)

            const remainingJsonPropertiesSet = JsMap.map(json, (k,v) => true)

            const promisesMap:JsMap<Promise<InterpreterResult>> = JsMap.map(props, (targetProperty, nameProp) => {
              const [sourceProperty, prop] = nameProp
              delete remainingJsonPropertiesSet[sourceProperty];
              return getJsonProperty(json, sourceProperty).fold(
                (err:Error) => Promise.reject(err),
                (v:any) => this.interpret(context.withoutUrl().withSetValue(v => setPropertyValue(resObj, targetProperty, v)), prop, v)
              )
            })

            const extraPropsStrategy = optExtraPropertiesStrategy.getOrElse( () => context.extraPropertiesStrategy )
            switch (extraPropsStrategy) {
              case ExtraPropertiesStrategy.fail:
                if (Object.keys(remainingJsonPropertiesSet).length > 0)
                  return Promise.reject(new Error(`extra properties ${Object.keys(remainingJsonPropertiesSet)} creating object ${jsConstr.name}`))

              case ExtraPropertiesStrategy.copy:
                JsMap.forEach(remainingJsonPropertiesSet, (k,v) => setPropertyValue(resObj,k, json[k]) )
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

        const interpretItem = () => this.interpret(context.withSetValue(v => context.setValue(new Option(v))), item, json)
        const setNone = () => {
          context.setValue(Option.None)
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
      (description, choices) => {
        if (!isNull(json)) {
          return this.findChoice(context, json, description, choices)
        } else {
          return Promise.reject(new Error("null"))
        }
      }
    )
  }

  findChoice(context:Context, json:any, description:string, choices:ValuePredicate<any>[]):Promise<InterpreterResult> {
    const cantFindChoice = () => Promise.reject(new Error(`could not find a valid choice for ${description}\ninput:\n${JSON.stringify(json, null, "  ")}`))
    return Arrays.findIndex(choices, choice => choice.predicate(json)).fold(
      cantFindChoice,
      (idx) => this.interpret(context, choices[idx].value(), json)
        /*
        .then(
        v => v,
        err => {
          return Promise.reject(err)
          / *
          const nchoices = choices.slice(idx+1)
          if (nchoices.length === 0) return cantFindChoice()
          else return this.findChoice(context, json, description, nchoices)

        }

      )*/
    )
  }

}
