import {Option, JsMap} from "flib"
import {ExtraPropertiesStrategy, Value, ChoiceValue, ObjectValue} from "../lib/model"
import {ResourceFetch} from "../lib/ResourceFetch"

export function promisesMap<V>(mp: JsMap<V>): (k: string) => Promise<Option<V>> {
  return (k: string) => {
    const v = mp[k];
    if (v === undefined || v === null) return Promise.reject(`missing: ${k}`)
    else return Promise.resolve(Option.option(v));
  };
}

export class TestFetcher {
  constructor(private extraPropertiesStrategy: ExtraPropertiesStrategy) {
  }
  private fetch<T>(url: string, testMapping: () => ObjectValue<T> | ChoiceValue<T>, cache: (k: string) => Promise<Option<any>>): Promise<T> {
    const rf = new ResourceFetch(ExtraPropertiesStrategy.fail, () => cache)
    return rf.fetchResource(url, testMapping)
  }
  fetchResource<T>(url: string, testMapping: () => ObjectValue<T> | ChoiceValue<T>, cache: (k: string) => Promise<Option<any>>): (f: (v: T) => void) => void {
    return f => {
      this.fetch(url, testMapping, cache).then(
        f,
        (err) => {
          console.log(err.stack)
          fail(`error getting url ${url} ${err}`)
        }
      )
    }
  }
  fetchFails(url: string, testMapping: () => ObjectValue<any> | ChoiceValue<any>, cache: (k: string) => Promise<Option<any>>): (f: (v: Error) => void) => void {
    return f => {
      this.fetch(url, testMapping, cache).then(
        (v) => { throw new Error("expecting a failure") },
        f
      )
    }
  }
}