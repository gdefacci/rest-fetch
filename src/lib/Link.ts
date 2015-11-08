import {JsType} from "./types"
import {TypeExpr} from "./TypeExpr"
import {PropertyName, PropertyHolder, getOrCreateLinksMeta, addObjectMapping, isArrayType, isOptionType} from "./Meta"
import {isNull} from "flib"

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


export function link(typ?: JsType<any> | PropertyHolder, opts1?:PropertyHolder): (target: any, key: string | symbol) => void {
  return (target: any, key: string | symbol) => {
    const propType = Reflect.getMetadata("design:type", target, key)

    const optsIsJsType = JsType.isJsType(typ)
    const linkType:JsType<any> = isNull(typ) || !optsIsJsType ? propType : typ;

    if (isNull(linkType)) {
      throw new Error(`could not infer type from declaration of property '${key}' in class '${target.constructor.name}'`)
    } if (optsIsJsType && !isNull(propType)) {
      const nop = () => {}
      JsType.fold(
        nop,
        nop,
        (arr) => {
          if (!isArrayType(propType)) throw new Error(`Error on property '${key}' in class '${target.constructor.name}': with link of array type a property of type 'Array' is required`)
        },
        (opt) => {
          if (!isOptionType(propType)) throw new Error(`Error on property '${key}' in class '${target.constructor.name}': with link of option type a property of type 'Option' is required`)
        },
        nop,
        nop
      )(<any>typ)
    }

    const objLinks = getOrCreateLinksMeta(target.constructor)
    const targetProperty = (opts1 && opts1.property) || (typ && typ["property"]) || key;
    addObjectMapping(objLinks, targetProperty, new Link(TypeExpr.fromJsType(linkType), key))
  }
}