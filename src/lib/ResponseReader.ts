export interface ResponseReader {
  (resp:Response, req:Request):Promise<any>
}

function parseJson(txt:string):Promise<any> {
  try {
    return Promise.resolve(JSON.parse(txt))
  } catch (e) {
    return Promise.reject(new Error(`Error parsing json ${e.message} json:\n${txt}`))
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
    return Promise.reject(new Error(`${reqDesc(req)} return status : ${resp.status}`))
  }
}

