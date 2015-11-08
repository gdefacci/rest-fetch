import {Option, isNull} from "flib"

export class SimpleConverter<A,B> implements SimpleConverter<A,B> {

  constructor(public convert:(v:A) => B, public description?:string) {
  }
  andThen<C>(f:(v:B) => C):SimpleConverter<A,C> {
    return new SimpleConverter<A,C>( a => f(this.convert(a)) )
  }
  compose<C>(f:(v:C) => A):SimpleConverter<C,B> {
    return new SimpleConverter<C,B>( a => this.convert(f(a)) )
  }
}

class FromTypeConverter<T> extends SimpleConverter<any,T> {
  constructor(pred:(a:any) => boolean, public description:string) {
    super( a => {
      if (pred(a)) return <T>a;
      else throw new Error(`error, ${a} is not a ${description}`)
    })
  }
}

export module SimpleConverter {

  export const identity = new SimpleConverter<any,any>(id => id, "identity")

  export function fromTypeOf<T>(typeString:string):SimpleConverter<any, T>  {
    return new FromTypeConverter<T>(a => typeof a === typeString, typeString)
  }

  export const fromString:SimpleConverter<any, string> = fromTypeOf<string>("string")
  export const fromNumber:SimpleConverter<any, number> = fromTypeOf<number>("number")
  export const fromBoolean:SimpleConverter<any, boolean> = fromTypeOf<boolean>("boolean")
  export const fromUndefined:SimpleConverter<any, any> = fromTypeOf<any>("undefined")

  export function optional<A,B>(cnv:SimpleConverter<A,B>):SimpleConverter<A,Option<B>> {
    return new SimpleConverter<A,Option<B>>( a => {
      if (isNull(a)) return Option.none<B>()
      else return Option.option(cnv.convert(a))
    })
  }

  export function fromArray<T>(c:SimpleConverter<any, T>):SimpleConverter<any, T[]> {
    const desc = isNull(c.description) ? "array" : `array of ${c.description}`
    return new SimpleConverter<any, T[]>( a => {
      if (Array.isArray(a)) return a.map(i => c.convert(i));
      else throw  new Error(`error, ${a} is not a ${desc}`)
    }, desc)
  }

}
