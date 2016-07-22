export type Try<T> = Success<T> | Failure

export class Success<T> {
  private __kind:Success<T> =  null
  constructor(public value:T) {
  }
  map<B>(f:(a:T) => B):Try<B> {
    try {
      return new Success<B>(f(this.value))
    } catch(e) {
      return new Failure(e)
    }
  }
  flatMap<B>(f:(a:T) => Try<B>):Try<B> {
    try {
      return f(this.value)
    } catch(e) {
      return new Failure(e)
    }
  }
  fold<T1>( onError:(err:Error) => T1, onSuccess:(a:T) => T1):T1 {
    return onSuccess(this.value)
  }
  toPromise():Promise<T> {
    return Promise.resolve<T>(this.value);
  }
}

export class Failure {
  private __kind:Failure =  null
  constructor(public error:Error) {
  }
  map<B>(f:(a:any) => B):Try<any> {
    return this
  }
  flatMap<B>(f:(a:any) => Try<B>):Try<B> {
    return this;
  }
  fold<T>( onError:(err:Error) => T, onSuccess:(a:any) => T):T {
    return onError(this.error)
  }
  toPromise():Promise<any> {
    return Promise.reject(this.error);
  }
}

