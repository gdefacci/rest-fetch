import {JsMap, Option, lazy} from "flib"
import {ExtraPropertiesStrategy, JsConstructor, ObjectValue, Value} from "./model"
import {newObjectsCache} from "./ObjectsCache"
import  ObjectValueBuilder from "./ObjectValueBuilder"

export interface MappingProperties {
  extraPropertiesStrategy:ExtraPropertiesStrategy
}

export class Mappings {

  static instance = new Mappings()

  static  defaultExtraPropertiesStrategy = ExtraPropertiesStrategy.copy

  static defaultMissingMapping() {
    return Value.object(Object, {}, ExtraPropertiesStrategy.copy)
  }

  private buildersMap = newObjectsCache<JsConstructor<any>,  ObjectValueBuilder<any>>()
  private mappingsMap = newObjectsCache<JsConstructor<any>,  ObjectValue<any>>()

  addProperty(container:JsConstructor<any>, targetProperty:string, sourceProperty:string, mapping:() => Value<any>) {
    const nm =  Option.option(container.name).getOrElse(() => "")
    const bldr = this.buildersMap.get(nm, container ).fold(
      () => {
        const newObjBuilder = new ObjectValueBuilder(container, {}, Mappings.defaultExtraPropertiesStrategy)
        this.buildersMap.put(nm, container, newObjBuilder)
        return newObjBuilder
      },
      bldr => bldr
    )
    bldr.add(targetProperty, sourceProperty, mapping)
  }

  setMappingProperties(container:JsConstructor<any>, properties:MappingProperties) {
    const nm =  Option.option(container.name).getOrElse(() => "")
    this.buildersMap.get(nm, container).fold<void>(
      () => {
        this.buildersMap.put(nm, container, new ObjectValueBuilder(container, {}, properties.extraPropertiesStrategy) )
      },
      bldr => {
        bldr.setExtraPropertiesStrategy(properties.extraPropertiesStrategy)
      }
    )
  }

  getMapping<T>(container:JsConstructor<T>):ObjectValue<T> {
    const nm =  Option.option(container.name).getOrElse(() => "")
    return this.mappingsMap.get(nm, container).fold<ObjectValue<T>>(
      () => this.buildersMap.get(nm, container).fold<ObjectValue<T>>(
        () => Value.object(container, {}, ExtraPropertiesStrategy.copy)(),
        (bldr) => {
          const r = bldr.build()
          this.mappingsMap.put(nm, container, r)
          return r;
        }
      ),
      (v) => v
    )
  }

}

export function mapping<T>(jsConstructor: JsConstructor<T>):() => ObjectValue<T> {
  if (jsConstructor === undefined || jsConstructor === undefined) throw new Error("null mapping")
  return () => Mappings.instance.getMapping(jsConstructor)
}

export function lazyMapping<T>(jsConstructor: () => JsConstructor<T>):() => ObjectValue<T> {
  return () => {
      const cnstr = jsConstructor()
     if (cnstr === undefined || cnstr === undefined) throw new Error("null mapping")
     return Mappings.instance.getMapping(cnstr)
  }
}