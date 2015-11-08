export function trap<T>(f:() => (Promise<T> | T), errorDescription?:(() => string) | string):Promise<T> {
  try {
    const r = f()
    if (r instanceof Promise) return r
    else return Promise.resolve(r)
  } catch(e) {
    const desc = typeof errorDescription === "function" ? errorDescription() : errorDescription;
    return Promise.reject(`${desc || ""} ${e.message}`)
  }
}
