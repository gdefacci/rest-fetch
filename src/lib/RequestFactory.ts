export interface RequestFactory {
  (url: string): Request
}

export function createRequestFactory(reqInit: RequestInit): RequestFactory {
  return url => {
    return new Request(url, reqInit);
  }
}

