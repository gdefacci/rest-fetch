import {JsMap, Option, isNull, fail} from "flib"
import {ConstructorType, ObjectFetcher, PropertyName, PropertyHolder, getOrCreateLinksMeta, ObjectMapping, addObjectMapping} from "./Meta"
import {JsType, GetPropertyUrl} from "./types"
import {jsTypeToInternalConversion} from "./InternalConversion"
import {SimpleConverter} from "./SimpleConverter"

export type ConversionTo<T> = (a:any, objectFetcher:ObjectFetcher, parentUrl:Option<string>) => Promise<T>
export type Conversion = ConversionTo<any>

export class Converter {
  constructor(public conversion:Conversion, public targetProperty: PropertyName, public resultType?: ConstructorType<any>) {
  }
}

function createConverter(conversion:JsType<any>, targetProperty: PropertyName, resultType?: ConstructorType<any>) {
  return new Converter(jsTypeToInternalConversion(conversion), targetProperty, resultType)
}

export function convert(ptyp?:JsType<any> | PropertyHolder, opts?: PropertyHolder) {
  return (target: any, key: string | symbol) => {
    const propType = Reflect.getMetadata("design:type", target, key)
    let typ:JsType<any> = isNull(ptyp) ?
      propType :
      (JsType.isJsType(ptyp) ? ptyp : SimpleConverter.identity);

    if (isNull(typ)) throw new Error(`undefined conversion for property ${key} of object ${target.constructor.name} `)
    const objLinks: ObjectMapping = getOrCreateLinksMeta(target.constructor)
    const targetProperty = (opts && opts.property) || (ptyp && ptyp["property"]) || key;
    addObjectMapping(objLinks, targetProperty, createConverter(typ, key, propType))
  }
}

export function toEnum<T>(a: any, desc: string): (str: String) => T {
  return valueFrom<T>(<any>a, desc);
}

export function valueFrom<T>(mp: JsMap<T>, desc: string): (str: String) => T {
  return (str: string) => {
    const r = mp[str];
    if (isNull(r)) throw Error(`${str} is not a ${desc}`)
    return r;
  }
}

export const propertyUrl = new GetPropertyUrl<string>(id => id.getOrElse( () => fail<string>("missing property url") ) )
export const optionalPropertyUrl = new GetPropertyUrl<Option<string>>(id => id)


