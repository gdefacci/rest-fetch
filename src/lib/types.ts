import {ConstructorType} from "./meta"
import {SimpleConverter} from "./SimpleConverter"
import {ChooseConverter} from "./ChooseConverter"
import {isNull, Option} from "flib"

export interface ArrayJsType<T> {
  arrayOf: JsType<T>
}

export interface OptionJsType<T> {
  optionOf: JsType<T>
}

export class GetPropertyUrl<B> {
  constructor(public convert: (a: Option<string>) => B) {
  }
  andThen<C>(f: (v: B) => C): GetPropertyUrl<C> {
    return new GetPropertyUrl<C>(a => f(this.convert(a)))
  }
}

export type ChooseConverterJsType<T> = ConstructorType<T> | ArrayJsType<T> | OptionJsType<T> | SimpleConverter<any, any> | GetPropertyUrl<any>
export type JsType<T> = ChooseConverterJsType<T> | ChooseConverter

export module JsType {
  function isPrimitiveType(a:any):boolean {
    return a === String || a === Number || a === Boolean
  }

  export function isJsType(t:any):boolean {
    const notIsPrim = !isPrimitiveType(t)
    return !isNull(t) && notIsPrim && (
      (typeof t === "function") ||
      (t instanceof SimpleConverter) || (t instanceof ChooseConverter) || (t instanceof GetPropertyUrl) ||
      isArrayJsType(t) || isOptionJsType(t)
    )
  }

  function trapBoolean(f:() => boolean):boolean {
    try {
      return f()
    } catch(e) {
      return false;
    }
  }

  function hasJsTypeProperty(a:any, property:string, desc:string) {
    if (!isNull(a) && a.hasOwnProperty(property)) {
      const itmType = a[property]
      const itmIsJsTyp = isJsType(itmType)
      //if (!itmIsJsTyp) throw new Error(`${desc} is invalid :${itmType}`)
      return itmIsJsTyp;
    } else
      return false
  }

  export function isArrayJsType(a:any) {
    return hasJsTypeProperty(a, "arrayOf", "arrayOf parameter")
  }

  export function isOptionJsType(a:any) {
    return hasJsTypeProperty(a, "optionOf", "optionOf parameter")
  }

  export function fold<R>(typ: (t: ConstructorType<any>) => R,
    simple: (cnv: SimpleConverter<any, any>) => R,
    array: (t: ArrayJsType<any>) => R,
    option: (t: OptionJsType<any>) => R,
    choose: (t: ChooseConverter) => R,
    propertyUrl: (t: GetPropertyUrl<any>) => R
  ):(t: JsType<any>) => R {
    return (t: JsType<any>) => {
      if (isNull(t)) throw new Error(`undefined JsType `)
      if (t instanceof SimpleConverter) return simple(t)
      else if (t instanceof ChooseConverter) return choose(t)
      else if (t instanceof GetPropertyUrl) return propertyUrl(t)
      else if (typeof t === "function") {
        if (!isPrimitiveType(t)) return typ(<any>t)
        else throw new Error(`invalid constructor type ${t}`)
      } else if (isArrayJsType(t)) return array(<any>t)
      else if (isOptionJsType(t)) return option(<any>t)
      else throw new Error(`unrecognized JsType ${JSON.stringify(t)}`)
    }
  }

  export const description:(typ:JsType<any>) => string =
    fold<string>(
      (ct) => `object ${ct.name}`,
      (simpleCnv) => `simple converter ${simpleCnv.description}`,
      (arryCnv) => `array of ${description(arryCnv.arrayOf)}`,
      (optionCnv) => `option of ${description(optionCnv.optionOf)}`,
      (choose) => `choice ${choose.description}`,
      (propUrl) => "Property Url")
}


