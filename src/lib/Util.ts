export function trap<T>(f:() => (Promise<T> | T), errorDescription?:((err) => string) | string):Promise<T> {
  try {
    const r = f()
    if (r instanceof Promise) return r
    else return Promise.resolve(r)
  } catch(err) {
    const desc = typeof errorDescription === "function" ? errorDescription(err) : errorDescription;
    return Promise.reject(new Error(`${desc || err.message}`))
  }
}
