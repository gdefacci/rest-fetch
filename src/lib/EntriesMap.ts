import {Arrays, JsMap, Option} from "flib"

export interface Entry<K,V> {
  key:K
  value:V
}

export class EntriesMap<K,V> {
  cache:JsMap<Entry<K,V>[]> = {}
  constructor(private keyPredicate:(a:K, b:K) => boolean, private failOnReplace?:boolean) {
  }
  get(ks:string, k:K):Option<V> {
    return Option.option(this.cache[ks]).flatMap( entries => {
      return Arrays.find<Entry<K,V>>(entries, e => this.keyPredicate(e.key, k) )
    } ).map( e => e.value )
  }
  store<T>(ks:string, k:K, v:V):void {
    Option.option<Entry<K,V>[]>(this.cache[ks]).fold(
      () => { this.cache[ks] = [{key:k, value:v}] },
      (entries) => {
         Arrays.find<Entry<K,V>>(entries, e => this.keyPredicate(e.key, k)).fold<void>(
          () => entries.push({key:k, value:v}),
          (oldValue) => {
            if (this.failOnReplace === true) throw new Error(`replacing previous entry ${ks} key ${k}`)
            else entries.push({key:k, value:v})
          }
        )
      }
    )
  }
}
