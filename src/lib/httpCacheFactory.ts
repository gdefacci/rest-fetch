import { Option, JsMap } from "flib"

class HttpCacheFactory {

  constructor(private requestFactory: (url: string) => Request, private responseReader: (resp: Response, req: Request) => Promise<any>) {
  }

  create(): (k: string) => Promise<Option<any>> {
    const cache: JsMap<Promise<any>> = {}
    return (url) => {
      if (url === undefined || url == null) throw new Error("undefined url");
      const cr = cache[url];
      if (cr !== null && cr !== undefined) return cr;
      else {
        const req = this.requestFactory(url)
        const r = window.fetch(url, req).then(resp => {
          if (resp.status=== 404) return Promise.resolve(Option.None)
          else if (resp.status >= 200 && resp.status < 300) return this.responseReader(resp, req).then( resp => Option.option(resp) )
          else return Promise.reject(new Error(`GET ${url}:\n${JSON.stringify(resp, null, 2)}`))
        })
        cache[url] = r
        return r;
      }
    }
  }

}

export default function httpCacheFactory(
  requestFactory: (url: string) => Request,
  responseReader: (resp: Response, req: Request) => Promise<any>): () => (url: string) => Promise<Option<any>> {

  const reqFactory = new HttpCacheFactory(requestFactory, responseReader)
  return () => reqFactory.create();
}