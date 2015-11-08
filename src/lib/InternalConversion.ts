import {JsType, ArrayJsType, OptionJsType, GetPropertyUrl} from "./types"
import {ConstructorType, ObjectFetcher, PropertyName} from "./meta"
import {SimpleConverter} from "./SimpleConverter"
import {ChooseConverter} from "./ChooseConverter"
import {Option, isNull} from "flib"
import {trap} from "./Util"

export type InternalConversionTo<T> = (a:any, objectFetcher:ObjectFetcher, parentUrl:Option<string>) => Promise<T>

function failedConversion(msg:string):InternalConversionTo<any> {
  return ():Promise<any>  =>  {
    return Promise.reject(msg)
  }
}

export const jsTypeToInternalConversion:(topts:JsType<any>) => InternalConversionTo<any> =
  JsType.fold<InternalConversionTo<any>>(
    (ct) => (a:any, objectFetcher:ObjectFetcher, parentUrl:Option<string>):Promise<any>  => {
        return objectFetcher(ct, a)
    },
    (s) => (a:any, objectFetcher:ObjectFetcher, parentUrl:Option<string>):Promise<any[]>  => {
      return trap( () => s.convert(a))
    },
    (arr) => {
      const itmCnv = jsTypeToInternalConversion(arr.arrayOf)
      return (a:any, objectFetcher:ObjectFetcher, parentUrl:Option<string>):Promise<any[]>  => {
        if (!Array.isArray(a)) return Promise.reject("invalid array ${a}")
        else return Promise.all(a.map(i => itmCnv(i, objectFetcher, parentUrl) ))
      }
    },
    (opts) => (a:any, objectFetcher:ObjectFetcher, parentUrl:Option<string>):Promise<Option<any>>  => {
      if (isNull(a)) return Promise.resolve(Option.none())
      else return objectFetcher(Object, a).then(obj => Option.some(obj))
    },
    (opts) => (a:any, objectFetcher:ObjectFetcher, parentUrl:Option<string>):Promise<any>  => {
      return objectFetcher(Object, a).then( obj => {
        const cnv = opts.convert(obj).map( t =>
          jsTypeToInternalConversion(t) ).getOrElse( () => failedConversion(`invalid ${isNull(opts.description) ? "choice" : opts.description}`) )
        return cnv(a, objectFetcher, parentUrl)
      })
    },
    (purl) => (a, ftcr, parUrl):Promise<any> => {
      return trap( () => purl.convert(parUrl) )
    })

