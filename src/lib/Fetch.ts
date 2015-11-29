import {JsMap, Option, isNull, lazy} from "flib"
import {ResponseReader, jsonResponseReader} from "./ResponseReader"
import {RequestFactory, createRequestFactory} from "./RequestFactory"
import {HttpCache, ByUrlCache} from "./cache"
import {ObjectFetcher, getLinksMeta} from "./Meta"
import {Link} from "./Link"
import {Converter} from "./Converter"
import {ResourceRetriever, ArrayResourceRetriever} from "./Retriever"
import {JsConstructor, MappingType, isOptionType} from "./types"
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

function createResourceRetriever(typ:MappingType, opts?:FetchOpts):ResourceRetrieverImpl {
  return new ResourceRetrieverImpl(typ, createContext(opts))
}

export function fetch<T>(typ:JsConstructor<T>, opts?:FetchOpts):ResourceRetriever<T> {
  return createResourceRetriever(typ, opts)
}

export function fetchArray<T>(typ:JsConstructor<T>, opts?:FetchOpts):ArrayResourceRetriever<T[]> {
  return createResourceRetriever({ arrayOf:typ }, opts)
}

export function fetchChoose(ch:Selector, opts?:FetchOpts):ResourceRetriever<any> {
  return createResourceRetriever(ch, opts)
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
  return <T>(typ: JsConstructor<T>, wso:any):Promise<T> => {
    return fetchProperties(context, typ, wso)
  }
}

class ResourceRetrieverImpl implements ResourceRetriever<any> {
  objectFetcher:() => ObjectFetcher
  cnv:() => InternalConversionTo<any>
  isArrayMappingType:() => boolean
  private typeExpr:() => TypeExpr
  constructor(private typ:MappingType, private context:Context) {
    this.objectFetcher = lazy(() => objectFetcherImpl(this.context))
    this.typeExpr = lazy(() => TypeExpr.fromMappingType(this.typ))
    this.cnv = lazy(() => jsTypeToInternalConversion(this.typ))
    this.isArrayMappingType = lazy(() => this.typeExpr().kind === TypeExprKind.array)
  }
  private waitPendingPromisesAndReturn(v:any):Promise<any> {
    return Promise.all(this.context.promisesToWait).then(u => Promise.resolve(v))
  }
  fromObject(wso:any): Promise<any> {
    return this.cnv()(wso, this.objectFetcher(), undefined).then(v => this.waitPendingPromisesAndReturn(v))
  }
  fromArray(wsos:any[]): Promise<any[]> {
    if (this.isArrayMappingType()) {
      return this.cnv()(wsos, this.objectFetcher(), undefined).then(v => this.waitPendingPromisesAndReturn(v))
    } else {
      return new ResourceRetrieverImpl({arrayOf:this.typ}, this.context).fromArray(wsos)
    }
  }
  from(url:string, req?: RequestInit):Promise<any> {
    if (this.isArrayMappingType()) {
      return Promise.reject(new Error(`trying to get an ArrayMappingType from ${url}`))
    } else {
      const rq = req !== undefined ? new Request(url, req) : this.context.requestFactory(url);
      let res:any = undefined
      return fetchLink(url, this.context,  this.typeExpr(), (v) => res = v, undefined).then(v => this.waitPendingPromisesAndReturn(res))
    }
  }
  fromUrls(urls:string[]):Promise<any> {
    if (this.isArrayMappingType()) {
      let res = undefined
      return fetchLink(urls, this.context, this.typeExpr(), (v) => res = v, undefined).then(v => this.waitPendingPromisesAndReturn(res))
    } else {
      return new ResourceRetrieverImpl({arrayOf:this.typ}, this.context).fromUrls(urls)
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

function fetchProperties<T>(context: Context, typ: JsConstructor<T>, wsobj: any, parentUrl?:string):Promise<T> {

  const links: JsMap<(Link | Converter)[]> =  getLinksMeta(typ).getOrElse( () => { return {} })
  const r = new typ()

  const mergedKeys = Object.keys(JsMap.merge<any>([wsobj, links]))
  const promises: Promise<any>[] = mergedKeys.map(k => {
    const v = wsobj[k]
    const lnks = links[k]

    if (isNull(v) && !isNull(lnks)) {

      const proms = lnks.map( linkOrCnv => {
        if (linkOrCnv instanceof Converter) {

          const errMessage = (err:Error) => `property ${k} of ${typ.name} is undefined, error: ${err.message}`

          return trap(() => linkOrCnv.conversion(undefined, objectFetcherImpl(context), Option.option(parentUrl)), errMessage).then( v =>
            r[linkOrCnv.targetProperty] = v
          )

        } else if (linkOrCnv instanceof Link) {

          const isOption = linkOrCnv.resultType.kind === TypeExprKind.option || isOptionType(<any>linkOrCnv.resultType.value);
          if (isOption) {
            r[linkOrCnv.targetProperty] = Option.none()
            return Promise.resolve()
          } else {
            return Promise.reject(new Error(`link property ${k} of ${typ.name} is undefined`))
          }
        }
      })
      return (proms.length === 0) ? Promise.resolve() : Promise.all(proms)

    } else {

      return Option.option(lnks).fold<Promise<any>>(
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


function fetchObject<T>(url:string, context:Context, resultType:JsConstructor<T>, callback:(a:T) => void):Promise<void> {
  return fetchInternal(context, resultType).fetch(context.requestFactory(url), callback)
}

function fetchUrl(url:string, context:Context):Promise<any> {
  return httpFetch(context.requestFactory(url), context.httpCache, context.responseReader)
}

function fetchLink(url:string | string[], context:Context, jsType:ExtTypeExpr, callback:(a:any) => void, propUrl:string):Promise<void> {
  const expectingArrayUrl = lazy(() => Promise.reject(new Error(`expecting an array but got ${url}`)))
  const expectingObjectUrl = lazy(() => Promise.reject(new Error(`expecting an string but got ${url}`)))

  return TypeExpr.foldExt<Promise<void>>(
    (resultType) => typeof url === "string" ? fetchObject(url, context, resultType, callback) : expectingObjectUrl(),
    (cnv) => {
      if (typeof url === "string") {

        const prom = fetchUrl(url, context).then( v => trap( () => {
          const r = cnv.convert(v)
          callback(r)
          return r;
        }))

        return withObjectCache(url, TypeExpr.fromMappingType(cnv), () => prom, context, callback )

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
          const p1 = fetchLink(u, context, arr.value, a => { res[idx] = a }, propUrl)
          return p1.then( i => Promise.resolve(i), err => Promise.reject(new Error(`error at index ${idx}, error:${err.message}`) ))
        })
        return Promise.all( proms ).then( u => callback(res) )
      }
    },
    (opt):Promise<void> => {
      if (isNull(url)) {
        callback(Option.none())
        return Promise.resolve<void>()
      } else {
        return fetchLink(url, context, opt.value, a => callback(Option.some(a)), propUrl)
      }
    },
    (choose) => {
      if (typeof url === "string" ) {
        return fetchUrl(url, context).then( wso => {
          return choose(wso).fold(
            () => Promise.reject(new Error(`no choice found for ${wso}`)),
            (typ) => fetchLink(url, context, typ, callback, propUrl)
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
      res = fetchLink(propValue, context, l.resultType, callback, parentUrl).then( i => Promise.resolve(i), err => {

      const msg = `error fetching property  ${propertyName} of ${typeName} as link: ${err.message}`
      return Promise.reject(new Error(msg))
    })
    } else {
      res = Promise.reject(new Error(`error fetching property  ${propertyName} of ${typeName} expecting a link got ${propValue}`))
    }

  } else if (l instanceof Converter) {

    res = l.conversion(propValue, objectFetcherImpl(context), Option.option(parentUrl)).then(i => {
      callback(i);
      return Promise.resolve(i)
    }, err => {

      const msg = `error applying conversion of property ${propertyName} of ${typeName}: ${err.message}`
      return Promise.reject(new Error(msg))
    })
  }
  return res;
}

function withObjectCache(url: string, typ:TypeExpr, f:() => Promise<any>, context: Context, callback:(a:any) => void):Promise<void>  {
  function storeCache<T>(url: string, cache: ObjectsCache, typ:TypeExpr, p: Promise<T>): Promise<any> {
    cache.store(url, typ, p)
    return p;
  }

  return context.cache.get(url, typ).fold(
    () => storeCache(url, context.cache, typ, f()),
    (cacheValue) => {

      context.promisesToWait.push(cacheValue.then(v => {
        callback(v)
        return v;
      }))

      return Promise.resolve()
    }
  )
}

function fetchInternal<T>(context: Context, typ: JsConstructor<T>): CallbackFetcher<T> {

  if (isNull(typ)) throw new Error(`fetchInternal: undefined type`)

  const linksMeta = typ && getLinksMeta(typ)
  const typExpr = TypeExpr.fromMappingType(typ)
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
      })

      return withObjectCache(req.url, typExpr, prom, context, callback)

    }
  }
}