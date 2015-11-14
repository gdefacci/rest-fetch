import {SelectorMappingType} from "./types"
import {lazy, Arrays, Option, JsMap, isNull} from "flib"

export class Selector implements Selector {
  constructor(public convert:(a:any) => Option<SelectorMappingType>, public description?:string) {
  }
  /*
  or(cnv:Selector, description?:string):Selector {
    const self = this
    return new Selector( a => {
      return self.convert(a).fold<Option<SelectorMappingType<any>>>(
        () => cnv.convert(a),
        (v) => Option.some(v)
      )
    }, description)
  }
  */
}

export module Selector {

  export function create(f:(a:any) => Option<SelectorMappingType>, description?:string):Selector {
    return new Selector(f, description)
  }

  export function value(ct:SelectorMappingType):Selector {
    return create(a => Option.some(ct))
  }

  export function byPropertyExists(entries:JsMap.Entry<SelectorMappingType>[], description?:string) {
    return new Selector(
      ws => Arrays.find(entries, e => !isNull(ws[e.key])).map(e => e.value),
      description)
  }

}

export class ByPropertySelector extends Selector {
  constructor(prop:(a:any) => string, private jsMap:() => JsMap<SelectorMappingType>, desc:string) {
    super( (a) => {
      const pv = prop(a)
      return Option.option(jsMap()[pv]);
    }, desc )
  }
  contains(nm:string):boolean {
    return !isNull(this.jsMap()[nm])
  }
}

export module ByPropertySelector {

  export function fromEntries(prop:(a:any) => string, bks:() => JsMap.Entry<SelectorMappingType>[], desc:string) {
    const mp = lazy( () => JsMap.create(bks()))
    return new ByPropertySelector(prop, mp, desc)
  }

}