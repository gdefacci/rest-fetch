export interface ResponseReader {
  (resp:Response, req:Request):Promise<any>
}

function parseJson(txt:string):Promise<any> {
  try {
    return Promise.resolve(JSON.parse(txt))
  } catch (e) {
    return Promise.reject(`Error parsing json ${e.message}`)
  }
}

function statusOk(resp:Response):boolean {
  const st = resp.status
  return (st >= 200 && st <300);
}

function reqDesc(req:Request):string {
  return `${req.method} ${req.url}`
}

export const jsonResponseReader:ResponseReader = (resp:Response, req:Request):Promise<any> => {
  if (statusOk(resp)) {
    return resp.text().then(parseJson)
  } else {
    return Promise.reject(`${reqDesc(req)} return status : ${resp.status}`)
  }
}

