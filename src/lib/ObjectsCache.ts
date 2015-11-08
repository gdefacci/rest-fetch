import {Arrays, JsMap, Option} from "flib"
import {TypeExpr} from "./TypeExpr"

export module ObjectsCache {
  export interface Entry {
    key:TypeExpr
    value:Promise<any>
  }
}

import Entry = ObjectsCache.Entry

export class ObjectsCache {
  cache:JsMap<Entry[]> = {}
  get(ks:string, k:TypeExpr):Option<Promise<any>> {
    return Option.option(this.cache[ks]).flatMap( entries => {
      return Arrays.find<Entry>(entries, e => e.key.equalTo(k) )
    } ).map( e => e.value )
  }
  store<T>(ks:string, k:TypeExpr, v:Promise<any>):void {
    Option.option<Entry[]>(this.cache[ks]).fold(
      () => { this.cache[ks] = [{key:k, value:v}] },
      (entries) => {
         Arrays.find<Entry>(entries, e => e.key.equalTo(k)).fold<void>(
          () => entries.push({key:k, value:v}),
          (v) => {
            throw new Error(`replacing previous entry ${ks} constructor type ${k}`)
          }
        )
      }
    )
  }
}

