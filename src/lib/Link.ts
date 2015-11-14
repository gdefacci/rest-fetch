import {MappingType} from "./types"
import {TypeExpr} from "./TypeExpr"
import {PropertyName, PropertyHolder, getOrCreateLinksMeta, addObjectMapping, isArrayType, isOptionType} from "./Meta"
import {lazy, isNull} from "flib"

export class Link {
  constructor(public resultType: TypeExpr, public targetProperty:PropertyName) {
    if (isNull(resultType)) {
      throw new Error("undefined resultType")
    }
    if (isNull(targetProperty)) {
      throw new Error("undefined targetProperty")
    }
  }
}

/**
 * FIXME
 * move validation logic outside, refactor
 */
export function link(typ?: MappingType | PropertyHolder, opts1?:PropertyHolder): (target: any, key: string | symbol) => void {
  return (target: any, key: string | symbol) => {
    const propType = Reflect.getMetadata("design:type", target, key)
    const typIsNull = isNull(typ)
    const errorPrefix = lazy(() => `Error on property '${key}' in class '${target.constructor.name}'`)

    const propTypeIsArray  = isArrayType(propType)
    const typIsArrayJsType = MappingType.isArrayJsType(typ)
    if (propTypeIsArray && !typIsArrayJsType) throw new Error(`${errorPrefix()}: Array property with undefined 'arrayOf' property`)
    else if (!propTypeIsArray && typIsArrayJsType) throw new Error(`${errorPrefix()}: with link of array type a property of type 'Array' is required`)

    const propTypeIsOption = isOptionType(propType)
    const typIsOptionJsType = MappingType.isOptionJsType(typ)
    if (propTypeIsOption && !typIsOptionJsType) throw new Error(`${errorPrefix()}: Option property with undefined 'optionOf' property`)
    else if (!propTypeIsOption && typIsOptionJsType) throw new Error(`${errorPrefix()}: with link of option type a property of type 'Option' is required`)

    const typIsJsType = MappingType.isJsType(typ)
    const linkType:MappingType = !typIsJsType ? propType : typ;

    if (isNull(linkType)) {
      throw new Error(`could not infer type from declaration of property '${key}' in class '${target.constructor.name}'`)
    }

    const objLinks = getOrCreateLinksMeta(target.constructor)
    const targetProperty = (opts1 && opts1.property) || (typ && typ["property"]) || key;
    let linkJsTyp:TypeExpr
    try {
       linkJsTyp = TypeExpr.fromJsType(linkType)
    } catch(e) {
      throw new Error(`${errorPrefix()} : ${e.message}`)
    }
    addObjectMapping(objLinks, targetProperty, new Link(linkJsTyp, key))
  }
}