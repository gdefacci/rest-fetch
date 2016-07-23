import {Option} from "flib"
import {ObjectValue  , ChoiceValue , ExtraPropertiesStrategy} from"./model"
import {cachedHttpFetch, httpFetch, requestFactory, jsonResponseParser} from "./HttpFetch"
import {ResourceFetch} from "./ResourceFetch"

export function fetchResource<T>(mapping:() => (ObjectValue<T> | ChoiceValue<T>)):{ from(url:string):Promise<T> } {
  const defaultEPS = () => ExtraPropertiesStrategy.copy
  const extraPropertiesStrategy = mapping().fold<ExtraPropertiesStrategy>(defaultEPS, defaultEPS, (o,p,e) => e.getOrElse( defaultEPS ), defaultEPS,  defaultEPS,  defaultEPS)

  const httpFetchFactory = () => cachedHttpFetch( httpFetch( requestFactory({ method:"GET" }), jsonResponseParser()))
  const resFetch = new ResourceFetch(extraPropertiesStrategy, httpFetchFactory)
  return {
    from(url:string):Promise<T> {
      return resFetch.fetchResource(url, mapping)
    }
  }
}