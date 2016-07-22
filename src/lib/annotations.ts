import {JsConstructor, ArrayValue, ChoiceValue, ObjectValue, OptionValue, SimpleValue, Value, ExtraPropertiesStrategy, foldCase} from "./model"
import {Mappings, MappingProperties} from "./Mappings"
import {lazy, Option} from "flib"
import {newObjectsCache} from "./ObjectsCache"

function assert(msg: () => string, b: boolean) {
  if (!b) throw new Error(msg())
}

function checkConsistent(v: Value<any>, propTyp: JsConstructor<any>, errorPrefix: () => string) {
  if (v === null || v === undefined) throw new Error("null mapping")
  const nop: () => void = () => null
  foldCase(nop,
    nop,
    () => {
      const errMsg = () => `${errorPrefix()}: expecting object got ${propTyp.name}`
      assert(errMsg, !isPrimitive(propTyp))
      assert(errMsg, propTyp !== <any>Option)
      assert(errMsg, propTyp !== Array)
    },
    () => assert(() => `${errorPrefix()}: expecting option got ${propTyp.name}`, propTyp === <any>Option),
    () => assert(() => `${errorPrefix()}: expecting array got ${propTyp.name}`, propTyp === Array),
    nop)(v)
}

function isPrimitive(typ: JsConstructor<any>) {
  return typ === Number || typ === Boolean || typ === String;
}

function makeLinkMapping(mp: ObjectValue<any> | OptionValue<any> | ChoiceValue<any>): Value<any> {
  if (mp instanceof OptionValue) {
    const item = mp.item()
    if ((item instanceof ObjectValue) || (item instanceof ChoiceValue)) {
      return Value.optionalLink(() => item)()
    } else {
        throw new Error(`invalid link mapping ${mp}`)
    }
  } else {
    return Value.link(() => mp)();
  }
}

export function link(mapping?: () => ObjectValue<any> | OptionValue<any> | ChoiceValue<any>, sourceProperty?: string) {
  return (target: any, targetProperty: string | symbol) => {
    const container = target.constructor
    const propType = Reflect.getMetadata("design:type", target, targetProperty)
    const errPrefix = () => `Property '${targetProperty}' of ${container.name}`
    const isNullMapping = (mapping === null || mapping === undefined)

    if (isNullMapping) {
      const cantInferType = () => `${errPrefix()}: cant infer link type`
      const errMsg = () => `${errPrefix()}: expecting a link got ${propType.name}`

      if (propType === undefined || propType === null) throw new Error(cantInferType())

      assert(errMsg, !isPrimitive(propType))
      assert(errMsg, propType !== Array)
      assert(cantInferType, propType !== Option)
    }

    const mapping1 = isNullMapping ? lazy(() => Mappings.instance.getMapping(propType)) : mapping;

    Mappings.instance.addProperty(container, <any>targetProperty, sourceProperty || <any>targetProperty, () => {
      const mpng = mapping1()
      checkConsistent(mpng, propType, errPrefix)
      return makeLinkMapping(mpng)
    })
  }
}

function getMappingFromPropType(propType: JsConstructor<any>): Value<any> {
  if (propType === Number) return Value.number()
  else if (propType === Boolean) return Value.boolean()
  else if (propType === String) return Value.string()
  else return Mappings.instance.getMapping(propType)
}

export function convert(mapping?: () => ObjectValue<any> | OptionValue<any> | ChoiceValue<any> | ArrayValue<any> | SimpleValue<any, any>, sourceProperty?: string) {
  return (target: any, targetProperty: string | symbol) => {
    const container = target.constructor
    const propType = Reflect.getMetadata("design:type", target, targetProperty)
    const errPrefix = () => `Property '${targetProperty}' of ${container.name}`
    const isNullMapping = (mapping === null || mapping === undefined)

    if (isNullMapping) {
      const cantInferType = () => `${errPrefix()}: cant infer type`

      if (propType === undefined || propType === null) throw new Error(cantInferType())
      else if (propType === Option) throw new Error(cantInferType())
      else if (propType === Array) throw new Error(cantInferType())
    }

    const mapping1: () => Value<any> = isNullMapping ?
      () => {
        const mp1 = getMappingFromPropType(propType)
        checkConsistent(mp1, propType, errPrefix)
        return mp1;
      } :
      () => {
        const mp1 = mapping()
        checkConsistent(mp1, propType, errPrefix)
        return mp1;
      }

    Mappings.instance.addProperty(container, <any>targetProperty, sourceProperty || <any>targetProperty, mapping1)
  }
}

export function fetchProperties(properties: MappingProperties) {
  return (target: JsConstructor<any>): void => {
    Mappings.instance.setMappingProperties(target, properties)
  }
}