import {JsMap, Option, Arrays} from "flib"
import {JsType, GetPropertyUrl} from "./types"
import {ConstructorType} from "./Meta"
import {SimpleConverter} from "./SimpleConverter"
import {Selector} from "./Selector"

export enum TypeExprKind {
  constructorFunction = 0,
  simpleConverter = 1,
  array = 2,
  option = 3,
  choice = 4,
  getPropertyUrl = 5
}

export type LeafTypeExpr = ConstructorType<any> | SimpleConverter<any,any> | Selector | GetPropertyUrl<any>

export type ExtTypeExpr = LeafTypeExpr | TypeExpr

export class TypeExpr {
  constructor(public kind:TypeExprKind, public folding:string, public leaf:LeafTypeExpr) {
    
  }
  equalTo(b:TypeExpr):boolean {
    return this.kind === b.kind && this.folding === b.folding && this.leaf === b.leaf
  }
  get value():ExtTypeExpr {
    if (this.folding.length === 0) return this.leaf
    else {
      const rest = this.folding.substr(1)
      if (rest.length > 0) {
        const hd = rest.charAt(0)
        switch(hd) {
          case "a": return new TypeExpr(TypeExprKind.array, rest, this.leaf)
          case "o": return new TypeExpr(TypeExprKind.option, rest, this.leaf)
          default: throw new Error("invalid folding "+hd)
        }
      } else {
        return TypeExpr.fromJsType(this.leaf)
      }
    }
  }
  get description():string {
    return TypeExpr.fold(
      (ct) => LeafTypeExpr.description(ct),
      (cnv) => LeafTypeExpr.description(cnv),
      () => {
        const v = this.value
        if (v instanceof TypeExpr) return `Array(${v.description})`;
        else return LeafTypeExpr.description(<any>v)
      },
      () => {
        const v = this.value
        if (v instanceof TypeExpr) return `Option(${v.description})`;
        else return LeafTypeExpr.description(<any>v)
      },
      (chs) => "Selector",
      (pu) => LeafTypeExpr.description(pu)
    )(this)
  }
}

export module LeafTypeExpr {

  export function fold<R>(typ: (t: ConstructorType<any>) => R,
    simple: (cnv: SimpleConverter<any, any>) => R,
    choose: (cnv:Selector) => R,
    propertyUrl: (t: GetPropertyUrl<any>) => R
  ):(t: LeafTypeExpr) => R {
    return t => {
      if (t instanceof SimpleConverter) return simple(t)
      else if (t instanceof Selector) {
        return choose(t)
      } else if (t instanceof GetPropertyUrl) return propertyUrl(t)
      else if (typeof t === "function") return typ(<any>t)
      else throw new Error("Invalid Leaf Type Expr "+t)
    }
  }

  export function description(l:LeafTypeExpr):string {
    return fold(
      (ct) => ct.name,
      (cnv) => cnv.description || "<SimpleConverter>",
      (chs) => chs.description || "<Selector>",
      () => "PropertyUrl"
    )(l)
  }

}

export module TypeExpr {

  export function create(ct:ConstructorType<any>) {
    return new TypeExpr(TypeExprKind.constructorFunction, "", ct)
  }

  export const fromJsType:(a:JsType<any>) => TypeExpr = JsType.fold(
    (ct) => new TypeExpr(TypeExprKind.constructorFunction, "", ct),
    (cnv) => new TypeExpr(TypeExprKind.simpleConverter, "", cnv),
    (arr) => {
      const itmTypeExpr = fromJsType(arr.arrayOf)
      return new TypeExpr(TypeExprKind.array, `a${itmTypeExpr.folding}`, itmTypeExpr.leaf)
    },
    (opt) => {
      const itmTypeExpr = fromJsType(opt.optionOf)
      return new TypeExpr(TypeExprKind.option, `o${itmTypeExpr.folding}`, itmTypeExpr.leaf)
    },
    (chs) => new TypeExpr(TypeExprKind.choice, "", chs),
    (gpu) => new TypeExpr(TypeExprKind.getPropertyUrl, "", gpu)
  )

 export function fold<R>(typ: (t: ConstructorType<any>) => R,
    simple: (cnv: SimpleConverter<any, any>) => R,
    array: (t: TypeExpr) => R,
    option: (t: TypeExpr) => R,
    choose: (f:(t: any) => Option<TypeExpr>) => R,
    propertyUrl: (t: GetPropertyUrl<any>) => R
  ):(t: TypeExpr) => R {
    return t => {
      switch(t.kind) {
        case TypeExprKind.constructorFunction: return typ(<any>t.value)
        case TypeExprKind.simpleConverter: return simple(<any>t.value)
        case TypeExprKind.array: return array(t)
        case TypeExprKind.option: return option(t)
        case TypeExprKind.choice:
          const chCnv = <Selector>t.value
          const f:(ws:any) => Option<TypeExpr> = (ws) =>
            chCnv.convert(ws).map( t => fromJsType(t))
          return choose(f)
        case TypeExprKind.getPropertyUrl: return propertyUrl(<any>t.value)
      }
    }
  }

  export function foldExt<R>(typ: (t: ConstructorType<any>) => R,
    simple: (cnv: SimpleConverter<any, any>) => R,
    array: (t: TypeExpr) => R,
    option: (t: TypeExpr) => R,
    choose: (f:(t: any) => Option<TypeExpr>) => R,
    propertyUrl: (t: GetPropertyUrl<any>) => R
  ):(t:ExtTypeExpr) => R {
    return t => {
      if (t instanceof TypeExpr) return fold(typ, simple, array, option, choose, propertyUrl)(t)
      else LeafTypeExpr.fold(
        (ct) => typ(ct),
        (cnv) => simple(cnv),
        (chs) => {
          const chCnv = t
          const f:(ws:any) => Option<TypeExpr> = (ws) => chs.convert(ws).map( t => TypeExpr.fromJsType(t))
          return choose(f)
        },
        (pu) => propertyUrl(pu)
      )
    }
  }


}