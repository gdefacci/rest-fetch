import {JsMap, Option, isNull, lazy} from "flib"
import {ResponseReader, jsonResponseReader} from "./ResponseReader"
import {RequestFactory, createRequestFactory} from "./RequestFactory"
import {HttpCache, ByUrlCache} from "./cache"
import {ObjectFetcher, ConstructorType, isOptionType, getLinksMeta} from "./Meta"
import {Link} from "./Link"
import {Converter} from "./Converter"
import {ResourceRetriever, ArrayResourceRetriever} from "./Retriever"
import {JsType} from "./types"
import {trap} from "./Util"
import {InternalConversionTo, jsTypeToInternalConversion} from "./InternalConversion"
import {Selector} from "./Selector"
import {ObjectsCache} from "./ObjectsCache"
import {TypeExpr, ExtTypeExpr, TypeExprKind} from "./TypeExpr"

export interface FetchOpts {
  requestFactory?: RequestFactory
  httpCache?: () => HttpCache
  responseReader?:ResponseReader
}

interface Context {
  requestFactory: RequestFactory
  httpCache: HttpCache
  cache: ObjectsCache
  responseReader:ResponseReader

  promisesToWait: Promise<any>[]
}

function createJsTypeRetriever(typ:JsType<any>, opts?:FetchOpts):JsTypeRetriever {
  return new JsTypeRetriever(typ, createContext(opts))
}

export function fetch<T>(typ:ConstructorType<T>, opts?:FetchOpts):ResourceRetriever<T> {
  return createJsTypeRetriever(typ, opts)
}

export function fetchArray<T>(typ:ConstructorType<T>, opts?:FetchOpts):ArrayResourceRetriever<T[]> {
  return createJsTypeRetriever({ arrayOf:typ }, opts)
}

export function fetchChoose(ch:Selector, opts?:FetchOpts):ResourceRetriever<any> {
  return createJsTypeRetriever(ch, opts)
}

function createContext(opts?: FetchOpts):Context {
  const requestFactory = (opts && opts.requestFactory) || createRequestFactory({ method: "GET" })
  const httpCache = (opts && opts.httpCache && opts.httpCache()) || new ByUrlCache()
  const cache = new ObjectsCache()
  const responseReader = (opts && opts.responseReader) || jsonResponseReader

  const context: Context = { cache: cache, httpCache: httpCache, requestFactory: requestFactory, responseReader:responseReader, promisesToWait: [] }
  return context;
}

function objectFetcherImpl<T>(context:Context) {
  return <T>(typ: ConstructorType<T>, wso:any):Promise<T> => {
    return fetchProperties(context, typ, wso)
  }
}

class JsTypeRetriever implements ResourceRetriever<any> {
  objectFetcher:() => ObjectFetcher
  cnv:() => InternalConversionTo<any>
  isArrayJsType:() => boolean
  private typeExpr:() => TypeExpr
  constructor(private typ:JsType<any>, private context:Context) {
    this.objectFetcher = lazy(() => objectFetcherImpl(this.context))
    this.typeExpr = lazy(() => TypeExpr.fromJsType(this.typ))
    this.cnv = lazy(() => jsTypeToInternalConversion(this.typ))
    this.isArrayJsType = lazy(() => this.typeExpr().kind === TypeExprKind.array)
  }
  private waitPendingPromisesAndReturn(v:any):Promise<any> {
    return Promise.all(this.context.promisesToWait).then(u => Promise.resolve(v))
  }
  fromObject(wso:any): Promise<any> {
    return this.cnv()(wso, this.objectFetcher(), undefined).then(v => this.waitPendingPromisesAndReturn(v))
  }
  fromArray(wsos:any[]): Promise<any[]> {
    if (this.isArrayJsType()) {
      return this.cnv()(wsos, this.objectFetcher(), undefined).then(v => this.waitPendingPromisesAndReturn(v))
    } else {
      return new JsTypeRetriever({arrayOf:this.typ}, this.context).fromArray(wsos)
    }
  }
  from(url:string, req?: RequestInit):Promise<any> {
    if (this.isArrayJsType()) {
      return Promise.reject(`trying to get an ArrayJsType from ${url}`)
    } else {
      const rq = req !== undefined ? new Request(url, req) : this.context.requestFactory(url);
      let res:any = undefined
      return fetchLinkJsType(url, this.context,  this.typeExpr(), (v) => res = v, undefined).then(v => this.waitPendingPromisesAndReturn(res))
    }
  }
  fromUrls(urls:string[]):Promise<any> {
    if (this.isArrayJsType()) {
      let res = undefined
      return fetchLinkJsType(urls, this.context, this.typeExpr(), (v) => res = v, undefined).then(v => this.waitPendingPromisesAndReturn(res))
    } else {
      return new JsTypeRetriever({arrayOf:this.typ}, this.context).fromUrls(urls)
    }
  }
}

function httpFetch(req: Request, httpCache: HttpCache, responseReader:ResponseReader): Promise<any> {
  return httpCache.get(req).fold(
    () => {
      const r = window.fetch(req.url, req).then(resp => responseReader(resp, req))
      httpCache.store(req, r)
      return r;
    },
    (v) => v)
}

interface CallbackFetcher<T> {
  fetch(req: Request, callback: (v: T) => void): Promise<any>
}

function log(msg:() => string) {
  //console.log(msg())
}

function fetchProperties<T>(context: Context, typ: ConstructorType<T>, wsobj: any, parentUrl?:string):Promise<T> {

  log( () =>`fetching properties of ${typ.name} from ${JSON.stringify(wsobj, undefined, "")}`)

  const links: JsMap<(Link | Converter)[]> =  getLinksMeta(typ).getOrElse( () => { return {} }) // || {};
  const r = new typ()
  const mergedKeys = Object.keys(JsMap.merge<any>([wsobj, links]))
  const promises: Promise<any>[] = mergedKeys.map(k => {
    const v = wsobj[k]

    if (v === undefined || v === null) {
      const lnks = links[k]

      const proms = lnks.map( linkOrCnv => {
        if (linkOrCnv instanceof Converter) {

          return linkOrCnv.conversion(undefined, objectFetcherImpl(context), Option.option(parentUrl)).then( v =>
            r[linkOrCnv.targetProperty] = v
          )

        } else if (linkOrCnv instanceof Link) {

          const isOption = linkOrCnv.resultType.kind === TypeExprKind.option || isOptionType(<any>linkOrCnv.resultType.value);
          if (isOption) {
            r[linkOrCnv.targetProperty] = Option.none()
          }
          return Promise.resolve()

        }
      })
      return (proms.length === 0) ? Promise.resolve() : Promise.all(proms)

    } else {

      return Option.option(links[k]).fold<Promise<any>>(
        () => {
          r[k] = v;
          return Promise.resolve()
        },
        (lnks) => {
          const proms:Promise<any>[] = lnks.map( l => fetchProperty(context, typ.name, k, v, parentUrl, l, v => { r[l.targetProperty] = v }) )
          return Promise.all(proms)
        }
      )
    }
  })

  return Promise.all(promises).then(v => r)
}


function fetchObject<T>(url:string, context:Context, resultType:ConstructorType<T>, callback:(a:T) => void):Promise<void> {
  if (isNull(resultType)) return Promise.reject(`undefined resultType`)
  else return fetchInternal(context, resultType).fetch(context.requestFactory(url), callback)
}

function fetchUrl(url:string, context:Context):Promise<any> {
  return httpFetch(context.requestFactory(url), context.httpCache, context.responseReader)
}

function fetchLinkJsType(url:string | string[], context:Context, jsType:ExtTypeExpr, callback:(a:any) => void, propUrl:string):Promise<void> {
  const expectingArrayUrl = lazy(() => Promise.reject(`expecting an array but got ${url}`))
  const expectingObjectUrl = lazy(() => Promise.reject(`expecting an string but got ${url}`))

  return TypeExpr.foldExt<Promise<void>>(
    (resultType) => typeof url === "string" ? fetchObject(url, context, resultType, callback) : expectingObjectUrl(),
    (cnv) => {
      if (typeof url === "string") {

        const prom = fetchUrl(url, context).then( v => trap( () => {
          const r = cnv.convert(v)
          callback(r)
          return r;
        }))

        return withObjectCache(url, TypeExpr.fromJsType(cnv), () => prom, context, callback )

      } else {
        return expectingObjectUrl()
      }
    },
    (arr) => {
      if (!Array.isArray(url)) {
        return expectingArrayUrl()
      } else {
        const res:any[] = []
        const proms = url.map( (u, idx) => {
          const p1 = fetchLinkJsType(u, context, arr.value, a => { res[idx] = a }, propUrl)
          return p1.then( i => Promise.resolve(i), err => Promise.reject(`error at index ${idx}, error:${err.message}`) )
        })
        return Promise.all( proms ).then( u => callback(res) )
      }
    },
    (opt):Promise<void> => {
      if (isNull(url)) {
        callback(Option.none())
        return Promise.resolve<void>()
      } else {
        return fetchLinkJsType(url, context, opt.value, a => callback(Option.some(a)), propUrl)
      }
    },
    (choose) => {
      if (typeof url === "string" ) {
        return fetchUrl(url, context).then( wso => {
          return choose(wso).fold(
            () => Promise.reject("no choice"),
            (typ) => fetchLinkJsType(url, context, typ, callback, propUrl)
          )
        })
      } else
        return expectingObjectUrl()
    },
    (pg) => {
      callback(pg.convert(Option.option(propUrl)))
      return Promise.resolve<void>()
    }
  )(jsType)
}


function fetchProperty(context: Context, typeName:string, propertyName:string, propValue:any, parentUrl:string, l: Link | Converter, callback: (v: any) => void):Promise<void> {
  let res:Promise<any>
  if (l instanceof Link) {

    if ((typeof propValue === "string") || Array.isArray(propValue)) {
      res = fetchLinkJsType(propValue, context, l.resultType, callback, parentUrl).then( i => Promise.resolve(i), err => {
      const msg = `error fetching property  ${propertyName} of ${typeName} as link: ${err}`
      return Promise.reject(msg)
    })
    } else {
      res = Promise.reject(`error fetching property  ${propertyName} of ${typeName} expecting a link got ${propValue}`)
    }

  } else if (l instanceof Converter) {

    res = l.conversion(propValue, objectFetcherImpl(context), Option.option(parentUrl)).then(i => {
      callback(i);
      return Promise.resolve(i)
    }, err => {
      const msg = `error applying conversion of property ${propertyName} of ${typeName}: ${err}`
      return Promise.reject(msg)
    })
  }
  return res;
}

let count = 0
function counter() {
  count += 1
  return count;
}

function withObjectCache(url: string, typ:TypeExpr, f:() => Promise<any>, context: Context, callback:(a:any) => void):Promise<void>  {
  function storeCache<T>(url: string, cache: ObjectsCache, typ:TypeExpr, p: Promise<T>): Promise<any> {
    cache.store(url, typ, p)
    return p;
  }

  return context.cache.get(url, typ).fold(
    () => {

      const idx = counter()
      const prefix = `${idx}          `
      log( () =>`${prefix} storing in cache ${typ.description} ${url}`)

      const f1 = f().then( r => {
        log( () =>`${prefix} stored in cache ${typ.description} ${url}`)
        return r;
      })

      return storeCache(url, context.cache, typ, f1)

    },
    (cacheValue) => {

      const idx = counter()
      const prefix = `${idx}          `
      log( () =>`${prefix} waiting for cache ${typ.description} ${url}`)

      context.promisesToWait.push(cacheValue.then(v => {
        callback(v)

        log( () =>`${prefix} waited completed ${typ.description} ${url}`)
        return v;
      }))

      return Promise.resolve()
    }
  )
}

function fetchInternal<T>(context: Context, typ: ConstructorType<T>): CallbackFetcher<T> {
  const linksMeta = typ && getLinksMeta(typ) //.getOrElse(() => undefined);
  const typExpr = TypeExpr.fromJsType(typ)
  return {
    fetch: (req: Request, callback: (v: T) => void):Promise<any> => {

      const prom = () => httpFetch(req, context.httpCache, context.responseReader).then(a => {
        return linksMeta.fold<any>(
          () => {
            const r: T = new typ()
            Object.keys(a).forEach(k => r[k] = a[k])
            callback(r)
            return r;
          },
          (linksMeta) => fetchProperties(context, typ, a, req.url).then(u => {
            callback(u);
            return u;
          })
        )
      }, err => {
        console.log("Error")
        console.log(err)
        return Promise.reject(err)
      })

      return withObjectCache(req.url, typExpr, prom, context, callback)

    }
  }
}




