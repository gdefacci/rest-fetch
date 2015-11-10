import {isNull, Option, JsMap} from "flib"
import {Link} from "./Link"
import {Converter} from "./Converter"
import {EntriesMap, Entry as EEntry} from "./EntriesMap"

export type ObjectMapping = JsMap<(Link | Converter)[]>

export type PropertyName = string | symbol;

/*
const annotationName = "linksmeta:annotation"

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
  //linksMeta?:ObjectMapping
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

class MetaLinksMap {
  linksMeta:EntriesMap<ConstructorType<any>, ObjectMapping>
  constructor() {
    this.linksMeta = new EntriesMap<ConstructorType<any>, ObjectMapping>( (a,b) => a === b )
  }
  get(ct:ConstructorType<any>):Option<ObjectMapping> {
    return this.linksMeta.get(ct.name, ct)
  }
  store(ct:ConstructorType<any>, v:ObjectMapping):void {
    this.linksMeta.store(ct.name, ct, v)
  }
}

const linksMeta = new MetaLinksMap()

export function addObjectMapping(mp:ObjectMapping, k:PropertyName, v:Link | Converter) {
  Option.option(mp[k]).fold<void>(
    () => mp[k] = [v],
    (entries) => entries.push(v)
  )
}

export function getLinksMeta<T>(c:ConstructorType<T>):Option<ObjectMapping> {
  return linksMeta.get(c)
}
export function getOrCreateLinksMeta<T>(c:ConstructorType<T>):ObjectMapping {
  return linksMeta.get(c).fold<ObjectMapping>(
    () => {
      const sup = getLinksMeta(c.prototype.__proto__.constructor).getOrElse( () => undefined )
      const lnks:ObjectMapping = (sup ===undefined) ? {} : JsMap.map(sup, (k,v) =>v)
      linksMeta.store(c, lnks)
      return lnks
    },
    (v) => v
  )
}


export function old_addObjectMapping(mp:ObjectMapping, k:PropertyName, v:Link | Converter) {
  Option.option(mp[k]).fold<void>(
    () => mp[k] = [v],
    (entries) => entries.push(v)
  )
}

/*
export function old_getOrCreateLinksMeta<T>(c:ConstructorType<T>):ObjectMapping {
  if (c.linksMeta === undefined) {
    c.linksMeta = {}
  }
  return c.linksMeta;
}
*/
