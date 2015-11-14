import {JsConstructor, MappingType, isArrayType, isOptionType} from "./types"
import {TypeExpr} from "./TypeExpr"
import {PropertyName, PropertyHolder, getOrCreateLinksMeta, addObjectMapping} from "./Meta"
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

function getMappingType(typ:MappingType | PropertyHolder, propType:JsConstructor<any>, errorPrefix:() => string): TypeExpr {
  const typIsNull = isNull(typ)

  const propTypeIsArray  = isArrayType(propType)
  const typIsArrayMappingType = MappingType.isArrayMappingType(typ)
  if (propTypeIsArray && !typIsArrayMappingType) throw new Error(`${errorPrefix()}: Array property with undefined 'arrayOf' property`)
  else if (!propTypeIsArray && typIsArrayMappingType) throw new Error(`${errorPrefix()}: with link of array type a property of type 'Array' is required`)

  const propTypeIsOption = isOptionType(propType)
  const typIsOptionMappingType = MappingType.isOptionMappingType(typ)
  if (propTypeIsOption && !typIsOptionMappingType) throw new Error(`${errorPrefix()}: Option property with undefined 'optionOf' property`)
  else if (!propTypeIsOption && typIsOptionMappingType) throw new Error(`${errorPrefix()}: with link of option type a property of type 'Option' is required`)

  const typIsMappingType = MappingType.isMappingType(typ)
  const linkType:MappingType = typIsMappingType ? <MappingType>typ : propType;

  if (isNull(linkType)) {
    throw new Error(`${errorPrefix()} : could not infer type`)
  }
  let linkJsTyp:TypeExpr
  try {
      linkJsTyp = TypeExpr.fromMappingType(linkType)
  } catch(e) {
    throw new Error(`${errorPrefix()} : ${e.message}`)
  }
  return linkJsTyp;
}


export function link(typ?: MappingType | PropertyHolder, opts1?:PropertyHolder): (target: any, key: string | symbol) => void {
  return (target: any, key: string | symbol) => {
    const propType = Reflect.getMetadata("design:type", target, key)
    const errorPrefix = lazy(() => `Error on property '${key}' in class '${target.constructor.name}'`)
    const linkJsTyp = getMappingType(typ, propType, errorPrefix)
    const objLinks = getOrCreateLinksMeta(target.constructor)
    const targetProperty = (opts1 && opts1.property) || (typ && typ["property"]) || key;

    addObjectMapping(objLinks, targetProperty, new Link(linkJsTyp, key))
  }
}