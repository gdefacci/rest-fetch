import { Option, JsMap } from "flib"
import { ExtraPropertiesStrategy, ChoiceValue, ObjectValue } from "../lib/model"
import { ResourceFetch } from "../lib/ResourceFetch"

export default class TestFetcher {
  public static promisesMap<V>(mp: JsMap<V>): (k: string) => Promise<Option<V>> {
    return (k: string) => {
      const v = mp[k];
      if (v === undefined || v === null) return Promise.reject(new Error(`missing: ${k}`))
      else return Promise.resolve(new Option(v));
    };
  }

  constructor(private extraPropertiesStrategy: ExtraPropertiesStrategy) {
  }

  private fetch<T>(url: string, testMapping: () => ObjectValue<T> | ChoiceValue<T>, cache: (k: string) => Promise<Option<any>>): Promise<T> {
    const rf = new ResourceFetch(this.extraPropertiesStrategy, () => cache)
    return rf.fetchResource(url, testMapping)
  }
  private fetchObj<T>(obj: any, testMapping: () => ObjectValue<T> | ChoiceValue<T>, cache: (k: string) => Promise<Option<any>>): Promise<T> {
    const rf = new ResourceFetch(this.extraPropertiesStrategy, () => cache)
    return rf.fetchObject(obj, testMapping)
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
        (v) => { throw new Error("expecting a failure while getting url ${url}") },
        f
      )
    }
  }
  fetchObject<T>(obj: any, testMapping: () => ObjectValue<T> | ChoiceValue<T>, cache: (k: string) => Promise<Option<any>>): (f: (v: T) => void) => void {
    return f => {
      this.fetchObj(obj, testMapping, cache).then(
        f,
        (err) => {
          console.log(err.stack)
          fail(`error getting object ${JSON.stringify(obj, null, 2)} ${err}`)
        }
      )
    }
  }
  fetchObjectFails(obj: any, testMapping: () => ObjectValue<any> | ChoiceValue<any>, cache: (k: string) => Promise<Option<any>>): (f: (v: Error) => void) => void {
    return f => {
      this.fetchObj(obj, testMapping, cache).then(
        (v) => { throw new Error("expecting a failure while getting object  ${JSON.stringify(obj, null, 2)}") },
        f
      )
    }
  }
}