import {lazy, JsMap, Option, isNull, fail} from "flib"
import {ObjectFetcher, PropertyName, PropertyHolder, getOrCreateLinksMeta, ObjectMapping, addObjectMapping} from "./Meta"
import {JsConstructor, MappingType, GetPropertyUrl, isPrimitiveType} from "./types"
import {jsTypeToInternalConversion} from "./InternalConversion"
import {SimpleConverter} from "./SimpleConverter"

export type ConversionTo<T> = (a:any, objectFetcher:ObjectFetcher, parentUrl:Option<string>) => Promise<T>
export type Conversion = ConversionTo<any>

export class Converter {
  constructor(public conversion:Conversion, public targetProperty: PropertyName, public resultType?: JsConstructor<any>) {
  }
}

function createConverter(conversion:MappingType, targetProperty: PropertyName, resultType?: JsConstructor<any>) {
  return new Converter(jsTypeToInternalConversion(conversion), targetProperty, resultType)
}

function getPrimitiveSimpleConverter(ct:JsConstructor<any>):SimpleConverter<any,any> {
  return SimpleConverter["from"+ct.name]
}

export function convert(ptyp?:MappingType | PropertyHolder, opts?: PropertyHolder) {
  return (target: any, key: string | symbol) => {
    const propType = Reflect.getMetadata("design:type", target, key)
    let typ:MappingType = !isNull(ptyp) && MappingType.isMappingType(ptyp) ?
      ptyp :
      (isNull(propType) ? SimpleConverter.identity : (isPrimitiveType(propType) ? getPrimitiveSimpleConverter(propType): propType));

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