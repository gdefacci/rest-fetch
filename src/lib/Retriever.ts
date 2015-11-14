import {JsConstructor} from "./types"

export interface Retriever<B> {
  fromObject(obj:any):Promise<B>
}

export interface ArrayResourceRetriever<B> extends Retriever<B> {
  fromUrls(urls:string[]):Promise<B[]>
}

export interface ResourceRetriever<B> extends ArrayResourceRetriever<B>, Retriever<B> {
  from(url:string, req?: RequestInit):Promise<B>
}


