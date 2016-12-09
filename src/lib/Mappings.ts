import { ExtraPropertiesStrategy, JsConstructor, ObjectValue, Value, ArrayValue, OptionValue, ChoiceValue } from "./model"
import { newObjectsCache } from "./ObjectsCache"
import ObjectValueBuilder from "./ObjectValueBuilder"

export interface MappingProperties {
  extraPropertiesStrategy: ExtraPropertiesStrategy
}

export class Mappings {

  static instance = new Mappings()

  static defaultExtraPropertiesStrategy = ExtraPropertiesStrategy.copy

  static defaultMissingMapping() {
    return Value.object(Object, {}, ExtraPropertiesStrategy.copy)
  }

  private buildersMap = newObjectsCache<JsConstructor<any>, ObjectValueBuilder<any>>()
  private mappingsMap = newObjectsCache<JsConstructor<any>, ObjectValue<any>>()

  addProperty(container: JsConstructor<any>, targetProperty: string, sourceProperty: string, mapping: () => Value<any>) {
    const nm = (container.name !== null && container.name !== undefined) ? container.name : ""
    const bldr = this.buildersMap.get(nm, container).fold(
      () => {
        const newObjBuilder = new ObjectValueBuilder(container, {}, Mappings.defaultExtraPropertiesStrategy)
        this.buildersMap.put(nm, container, newObjBuilder)
        return newObjBuilder
      },
      (bldr: ObjectValueBuilder<any>) => bldr
    )
    bldr.add(targetProperty, sourceProperty, mapping)
  }

  setMappingProperties(container: JsConstructor<any>, properties: MappingProperties) {
    const nm = (container.name !== null && container.name !== undefined) ? container.name : ""
    this.buildersMap.get(nm, container).fold<void>(
      () => {
        this.buildersMap.put(nm, container, new ObjectValueBuilder(container, {}, properties.extraPropertiesStrategy))
      },
      (bldr: ObjectValueBuilder<any>) => {
        bldr.setExtraPropertiesStrategy(properties.extraPropertiesStrategy)
      }
    )
  }

  getMapping<T>(container: JsConstructor<T>): ObjectValue<T> {
    const nm = (container.name !== null && container.name !== undefined) ? container.name : ""
    return this.mappingsMap.get(nm, container).fold<ObjectValue<T>>(
      () => this.buildersMap.get(nm, container).fold<ObjectValue<T>>(
        () => Value.object(container, {}, ExtraPropertiesStrategy.copy)(),
        (bldr: ObjectValueBuilder<any>) => {
          const r = bldr.build()
          this.mappingsMap.put(nm, container, r)
          return r;
        }
      ),
      (v: ObjectValue<any>) => v
    )
  }

}

export module Lazy {
  export function mapping<T>(jsConstructor: () => JsConstructor<T>): () => ObjectValue<T> {
    return () => {
      const cnstr = jsConstructor()
      if (cnstr === undefined || cnstr === undefined) throw new Error("null mapping")
      return Mappings.instance.getMapping(cnstr)
    }
  }
  export function arrayOf<T>(jsConstructor: () => JsConstructor<T>): () => ArrayValue<T[]> {
    return Value.array(mapping(jsConstructor))
  }

  export function optionOf<T>(jsConstructor: () => JsConstructor<T>): () => OptionValue<T> {
    return Value.option(mapping(jsConstructor))
  }

  export function arrayOfLinks<T>(jsConstructor: () => JsConstructor<T>): () => ArrayValue<T[]> {
    return Value.array(Value.link(mapping(jsConstructor)))
  }

  export function optionalLink<T>(jsConstructor: () => JsConstructor<T>): () => OptionValue<T> {
    return Value.option(Value.link(mapping(jsConstructor)))
  }

  export function choose(description:string, ... p: [(o: any) => boolean, () => JsConstructor<any>][]): () => ChoiceValue<any> {
    const cases = p.map(p => {
      const [pred, constr] = p
      return Value.match(pred)(mapping(constr))
    })
    return Value.choice(description, cases)
  }

}

export function mapping<T>(jsConstructor: JsConstructor<T>): () => ObjectValue<T> {
  return Lazy.mapping(() => jsConstructor)
}

export function arrayOf<T>(jsConstructor: JsConstructor<T>): () => ArrayValue<T[]> {
  return Lazy.arrayOf(() => jsConstructor)
}

export function arrayOfLinks<T>(jsConstructor: JsConstructor<T>): () => ArrayValue<T[]> {
  return Lazy.arrayOfLinks(() => jsConstructor)
}

export function optionalLink<T>(jsConstructor: JsConstructor<T>): () => OptionValue<T> {
  return Lazy.optionalLink(() => jsConstructor)
}

export function optionOf<T>(jsConstructor: JsConstructor<T>): () => OptionValue<T> {
  return Lazy.optionOf(() => jsConstructor)
}

export function choose(description:string, ... ps: [(o: any) => boolean, JsConstructor<any>][]): () => ChoiceValue<any> {
  const cases = ps.map(p  => {
    const [pred, jsc] = p
    const r:[(o: any) => boolean, () => JsConstructor<any>] = [pred, () => jsc]
    return r
  })
  return Lazy.choose(description, ... cases)
}