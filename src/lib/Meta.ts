import {isNull, Option, JsMap} from "flib"
import {Link} from "./Link"
import {Converter} from "./Converter"

export type ObjectMapping = JsMap<(Link | Converter)[]>

export type PropertyName = string | symbol

const annotationName = "linksmeta:annotation"

export function addObjectMapping(mp:ObjectMapping, k:PropertyName, v:Link | Converter) {
  Option.option(mp[k]).fold<void>(
    () => mp[k] = [v],
    (entries) => entries.push(v)
  )
}

export function getOrCreateLinksMeta<T>(c:ConstructorType<T>):ObjectMapping {
  if (c.linksMeta === undefined) {
    c.linksMeta = {}
  }
  return c.linksMeta;
}

/*

export function addObjectMapping(mp:ObjectMapping, k:PropertyName, v:Link | Converter) {
  Option.option(mp[k]).fold<void>(
    () => mp[k] = [v],
    (entries) => entries.push(v)
  )
}

export function getOrCreateLinksMeta<T>(c:ConstructorType<T>):ObjectMapping {
  let linksMeta = Reflect.getMetadata(annotationName, c)
  if (isNull(linksMeta)) {
    linksMeta = {};
    Reflect.defineMetadata(annotationName, c, linksMeta)
  }
  return linksMeta;
}

export function getLinksMeta<T>(ct:ConstructorType<T>) {
  return Reflect.getMetadata(annotationName, ct)
}
*/

export interface ConstructorType<T> extends Function {
  new (): T
  name?:string
  linksMeta?:ObjectMapping
}

export interface PropertyHolder {
  property?:string
}

/*
export interface ObjectFetcher {
  fetch<T>(typ: ConstructorType<T>, wso:any):Promise<T>
}
*/
export interface ObjectFetcher {
  <T>(typ: ConstructorType<T>, wso:any):Promise<T>
}


function eq(a,b){
  return a === b;
}

export function isOptionType(a:ConstructorType<any>):boolean {
  return eq(a, Option)
}

export function isArrayType(a:ConstructorType<any>):boolean {
  return eq(a, Array)
}