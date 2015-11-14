import {JsMap} from "flib"
import {Option} from "flib"

export interface HttpCache {
  get(req:Request):Option<Promise<any>>
  store(req:Request, promise:Promise<any>):void
}

type ByUrlMap = JsMap<Promise<any>>

export class ByUrlCache implements HttpCache {
  private cache:ByUrlMap = {}

  get(req:Request):Option<Promise<any>> {
    return Option.option(this.cache[req.url])
  }
  store(req:Request, promise:Promise<any>):void {
    this.cache[req.url] = promise;
  }
}

export const noCache = {
  get(req:Request):Option<Promise<any>> {
    return Option.none<Promise<any>>()
  },
  store(req:Request, promise:Promise<any>):void {
  }
}

