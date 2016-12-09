import {JsMap, Option, Arrays} from "flib"

export interface ObjectsCache<K, V> {
  put(url: string, k: K, value: V): void
  get(url: string, k: K): Option<V>
}

export function newObjectsCache<K,V>():ObjectsCache<K, V> {
  return new EntriesMap<K,V>((a,b) => a === b)
}

interface Entry<K,V> {
  key:K
  value:V
}

class EntriesMap<K,V> implements ObjectsCache<K,V> {
  cache:JsMap<Entry<K,V>[]> = {}
  constructor(private keyPredicate:(a:K, b:K) => boolean) {
  }
  get(ks:string, k:K):Option<V> {
    return new Option<Entry<K,V>[]>(this.cache[ks]).flatMap( entries => {
      return Arrays.find<Entry<K,V>>(entries, e => this.keyPredicate(e.key, k) )
    } ).map( e => e.value )
  }
  put(ks:string, k:K, v:V):void {
    new Option<Entry<K,V>[]>(this.cache[ks]).fold(
      () => { this.cache[ks] = [{key:k, value:v}] },
      entries => {
         Arrays.find<Entry<K,V>>(entries, e => this.keyPredicate(e.key, k)).fold<void>(
          () => entries.push({key:k, value:v}),
          (oldValue:Entry<K,V>) => {
            oldValue.value = v
            //throw new Error(`replacing previous entry ${ks} key ${k}`)
          }
        )
      }
    )
  }
}
