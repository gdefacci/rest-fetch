import {Option, fail, JsMap} from "flib"
import {ByUrlCache} from "../index"

export function assert(b: boolean, desc?:string) {
  if (!b) {
    throw new Error(`Assertion error ${desc}`);
  }
}

export function testOpts(data:JsMap<any>) {
  const testHttpCache = new ByUrlCache()
  Object.keys(data).forEach( k => {
    testHttpCache.store(new Request(k), Promise.resolve(data[k]))
  })

  return {
    httpCache() {
      return testHttpCache;
    }
  }
}

export function checkFail(f:() => any, desc?:string) {
  let failed = false
  try {
    f()
    failed = true
  } catch(e) {
    console.log("checked exeption")
    console.log(e)
    console.log("======================================")
  }
  if (failed) throw new Error(`${desc || ""} did not failed `)
}