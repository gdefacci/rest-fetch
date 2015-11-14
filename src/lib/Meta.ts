import {Option, JsMap} from "flib"
import {Link} from "./Link"
import {Converter} from "./Converter"
import {EntriesMap} from "./EntriesMap"

export type ObjectMapping = JsMap<(Link | Converter)[]>

export type PropertyName = string | symbol;

export interface ConstructorType<T> extends Function {
  new (): T
  name?:string
}

export interface PropertyHolder {
  property?:string
}

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

export class MetaLinksMap {
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


export module ExternalStrategy {
  /**
  * FIXME
  * refactor folling methods
  */
  const linksMeta = new MetaLinksMap()

  function copyObjectMapping(o:ObjectMapping):ObjectMapping {
    const res:ObjectMapping = {}
    Object.keys(o).forEach( k => res[k] = o[k].map(c => c) )
    return res;
  }

  function superClassConstructor(c:ConstructorType<any>):ConstructorType<any> {
    return c.prototype.__proto__.constructor;
  }

  export function getLinksMeta<T>(c:ConstructorType<T>):Option<ObjectMapping> {
    return linksMeta.get(c)
  }


  export function getOrCreateLinksMeta<T>(c:ConstructorType<T>):ObjectMapping {
    return linksMeta.get(c).fold<ObjectMapping>(
      () => {
        const sup = getLinksMeta(superClassConstructor(c))
        const lnks:ObjectMapping = sup.map( sup => copyObjectMapping(sup)).getOrElse(() => { return {} })
        linksMeta.store(c, lnks)
        return lnks
      },
      (v) => v
    )
  }

}

export function addObjectMapping(mp:ObjectMapping, k:PropertyName, v:Link | Converter) {
  Option.option(mp[k]).fold<void>(
    () => mp[k] = [v],
    (entries) => entries.push(v)
  )
}

export const getLinksMeta = ExternalStrategy.getLinksMeta
export const getOrCreateLinksMeta = ExternalStrategy.getOrCreateLinksMeta