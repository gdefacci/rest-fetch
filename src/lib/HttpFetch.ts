import {Option, JsMap} from "flib"

export interface ResponseParser {
  (resp:Response, req:Request):Promise<Option<any>>
}

export interface RequestFactory {
  (url:string):Request
}

export interface HTTPFetch {
  (url:string):Promise<Option<any>>
}

export function requestFactory(reqInit:RequestInit):RequestFactory {
   return (url:string) => new Request(url, reqInit);
}

const status2xx = (r:Response):boolean => {
  const code = r.status
  return (code >= 200) && (code < 300);
}

const status404 = (r:Response):boolean => {
  return (r.status == 404)
}

export function jsonResponseParser(statusOk:(req:Response) => boolean = status2xx, statusNotFound:(req:Response) => boolean = status404) {
   return (resp:Response, req:Request):Promise<Option<any>> => {
    if (statusOk(resp)) {
      return resp.text().then(parseJson).then( v => Option.option(v) )
    } else if (statusNotFound(resp)) {
      return Promise.resolve(Option.none())
    } else {
      return Promise.reject(`${req.method} ${req.url} return status : ${resp.status}`)
    }
  }
}

function parseJson(txt:string):Promise<any> {
  try {
    return Promise.resolve(JSON.parse(txt))
  } catch (e) {
    return Promise.reject(`Error parsing json ${e.message}`)
  }
}

export function httpFetch(requestFactory:RequestFactory, responseParser:ResponseParser):HTTPFetch {
  return (url) => {
    const request = requestFactory(url)
    return fetch(request).then( response => responseParser(response, request))
  }
}

export function cachedHttpFetch(hf:HTTPFetch, cacheFactory:() => JsMap<Promise<Option<any>>> = () => ({})):HTTPFetch {
  const cache:JsMap<Promise<Option<any>>> = cacheFactory()
  return (url) => {
    return Option.option(cache[url]).fold(
      () => {
        const result = hf(url)
        cache[url] = result;
        return result
      },
      (v) => v
    )
  }
}