import {Option, JsMap} from "flib"
import {Link} from "./Link"
import {Converter} from "./Converter"
import {EntriesMap} from "./EntriesMap"
import {JsConstructor} from "./types"

export type ObjectMapping = JsMap<(Link | Converter)[]>

export type PropertyName = string | symbol;

export interface PropertyHolder {
  property?:string
}

export interface ObjectFetcher {
  <T>(typ: JsConstructor<T>, wso:any):Promise<T>
}

export class MetaLinksMap {
  linksMeta:EntriesMap<JsConstructor<any>, ObjectMapping>
  constructor() {
    this.linksMeta = new EntriesMap<JsConstructor<any>, ObjectMapping>( (a,b) => a === b )
  }
  get(ct:JsConstructor<any>):Option<ObjectMapping> {
    return this.linksMeta.get(ct.name, ct)
  }
  store(ct:JsConstructor<any>, v:ObjectMapping):void {
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

  function superClassConstructor(c:JsConstructor<any>):JsConstructor<any> {
    return c.prototype.__proto__.constructor;
  }

  export function getLinksMeta<T>(c:JsConstructor<T>):Option<ObjectMapping> {
    return linksMeta.get(c)
  }


  export function getOrCreateLinksMeta<T>(c:JsConstructor<T>):ObjectMapping {
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