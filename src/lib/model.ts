import {JsMap, Option, Arrays, fail, lazy} from "flib"
import {Try, Success, Failure} from "./Try"
import {ObjectsCache, newObjectsCache} from"./ObjectsCache"

export enum SimpleValueKind {
  booleanKind, numberKind, textKind, getUrlKind
}

export interface JsConstructor<T> extends Function {
  new (): T
  name?: string
}

export interface ValueNT<O> {
  <T>(item: Value<T>): O
}

export interface RawValueNT<O> {
  <T>(item: RawValue<any, T>): O
}

export abstract class Value<T> {
  fold<T1>(
    onRawValue:RawValueNT<T1>,
    onLink: (item: ObjectValue<T> | ChoiceValue<T>, notFoundHandler:(resourceName:string) => T) => T1,
    onObject: (jsConstructor: JsConstructor<T>, properties: JsMap<[string, Value<any>]>, extraPropertiesStrategy: Option<ExtraPropertiesStrategy>) => T1,
    onOption: ValueNT<T1>,
    onSeq: ValueNT<T1>,
    onChoice: (items: ValuePredicate<any>[]) => T1
  ): T1
}

export function foldCase<T1>(
  onRawValue:RawValueNT<T1>,
  onLink: () => T1,
  onObject: () => T1,
  onOption: () => T1,
  onSeq: () => T1,
  onChoice: () => T1
): (v: Value<any>) => T1 {
  return v => {
    if (v instanceof SimpleValue) {
      return onRawValue(v.rawValue);
    } else if (v instanceof LinkValue) {
      return onLink()
    } else if (v instanceof ObjectValue) {
      return onObject()
    } else if (v instanceof OptionValue) {
      return onOption()
    } else if (v instanceof ArrayValue) {
      return onSeq()
    } else if (v instanceof ChoiceValue) {
      return onChoice()
    } else {
      throw new Error("invalid case ")
    }
  }
}

export class RawValue<I, T> {
  static boolean = new RawValue<boolean,boolean>(SimpleValueKind.booleanKind, i => i)
  static number = new RawValue<number,number>(SimpleValueKind.numberKind, i => i)
  static string = new RawValue<string,string>(SimpleValueKind.textKind, i => i)
  static getUrl = new RawValue<Option<string>,Option<string>>(SimpleValueKind.getUrlKind, i => i)

  constructor(public kind: SimpleValueKind, public f: (i: I) => T) {
  }
  map<T1>(f1: (p: T) => T1): RawValue<I, T1> {
    return new RawValue<I, T1>(this.kind, (i: I) => f1(this.f(i)));
  }
  fold<T1>(
    onBoolean: (f: (v: boolean) => T) => T1,
    onNumber: (f: (v: number) => T) => T1,
    onString: (f: (v: string) => T) => T1,
    onGetUrl: (f: (v: Option<string>) => T) => T1
  ): T1 {
    switch (this.kind) {
      case SimpleValueKind.booleanKind: return onBoolean(<any>this.f)
      case SimpleValueKind.numberKind: return onNumber(<any>this.f)
      case SimpleValueKind.textKind: return onString(<any>this.f)
      case SimpleValueKind.getUrlKind: return onGetUrl(<any>this.f)
      default:
        throw new Error(`invalid match ${this.kind}`);
    }
  }
}

export class SimpleValue<I, T> extends Value<T> {
  constructor(public rawValue:RawValue<I,T>) {
    super()
  }
  map<T1>(f1: (p: T) => T1): SimpleValue<I, T1> {
    return new SimpleValue<I, T1>(this.rawValue.map(f1));
  }
  fold<T1>(
    onRawValue:RawValueNT<T1>,
    onLink: (item: ObjectValue<T> | ChoiceValue<T>, notFoundHandler:(resourceName:string) => T) => T1,
    onObject: (jsConstructor: JsConstructor<T>, properties: JsMap<[string, Value<any>]>, extraPropertiesStrategy: Option<ExtraPropertiesStrategy>) => T1,
    onOption: ValueNT<T1>,
    onSeq: ValueNT<T1>,
    onChoice: (items: ValuePredicate<any>[]) => T1
  ): T1 {
    return onRawValue(this.rawValue)
  }
}

export class OptionValue<T> extends Value<Option<T>> {
  constructor(public item: () => Value<T>) {
    super()
  }
  fold<T1>(
    onRawValue:RawValueNT<T1>,
    onLink: (item: ObjectValue<Option<T>> | ChoiceValue<Option<T>>) => T1,
    onObject: (jsConstructor: JsConstructor<Option<T>>, properties: JsMap<[string, Value<any>]>, extraPropertiesStrategy: Option<ExtraPropertiesStrategy>) => T1,
    onOption: ValueNT<T1>,
    onSeq: ValueNT<T1>,
    onChoice: (items: ValuePredicate<any>[]) => T1
  ): T1 {
    return onOption(this.item())
  }
}

export class ArrayValue<T> extends Value<T[]> {
  constructor(public item: () => Value<any>) {
    super()
  }
  fold<T1>(
    onRawValue:RawValueNT<T1>,
    onLink: (item: ObjectValue<T[]> | ChoiceValue<T[]>) => T1,
    onObject: (jsConstructor: JsConstructor<T[]>, properties: JsMap<[string, Value<any>]>, extraPropertiesStrategy: Option<ExtraPropertiesStrategy>) => T1,
    onOption: ValueNT<T1>,
    onSeq: ValueNT<T1>,
    onChoice: (items: ValuePredicate<any>[]) => T1
  ): T1 {
    return onSeq(this.item())
  }
}


export class LinkValue<T> extends Value<T> {
  constructor(private item: () => ObjectValue<T> | ChoiceValue<T>, private notFoundHandler:(resourceName:string) => T) {
    super()
  }
  fold<T1>(
    onRawValue:RawValueNT<T1>,
    onLink: (item: ObjectValue<T> | ChoiceValue<T>, notFoundHandler:(resourceName:string) => T) => T1,
    onObject: (jsConstructor: JsConstructor<T>, properties: JsMap<[string, Value<any>]>, extraPropertiesStrategy: Option<ExtraPropertiesStrategy>) => T1,
    onOption: ValueNT<T1>,
    onSeq: ValueNT<T1>,
    onChoice: (items: ValuePredicate<any>[]) => T1
  ): T1 {
    return onLink(this.item(), this.notFoundHandler)
  }
}

export enum ExtraPropertiesStrategy {
  discard, copy, fail
}

export class ObjectValue<T> extends Value<T> {

  private props: JsMap<[string, Value<any>]>
  constructor(public jsConstructor: JsConstructor<T>, private properties: JsMap<(() => Value<any>) | [string, () => Value<any>]>, private extraPropertiesStrategy: Option<ExtraPropertiesStrategy>) {
    super()
  }
  fold<T1>(
    onRawValue:RawValueNT<T1>,
    onLink: (item: ObjectValue<T> | ChoiceValue<T>, notFoundHandler:(resourceName:string) => T) => T1,
    onObject: (jsConstructor: JsConstructor<T>, properties: JsMap<[string, Value<any>]>, extraPropertiesStrategy: Option<ExtraPropertiesStrategy>) => T1,
    onOption: ValueNT<T1>,
    onSeq: ValueNT<T1>,
    onChoice: (items: ValuePredicate<any>[]) => T1
  ): T1 {
    if (this.props === undefined || this.props === null) {
      this.props = JsMap.map(this.properties, (k, v) => {
        const [sourceProperty, lazyValue] = Array.isArray(v) ? v : [k, v];
        const r: [string, Value<any>] = [sourceProperty, lazyValue()]
        return r
      })
    }

    return onObject(this.jsConstructor, this.props, this.extraPropertiesStrategy)
  }
}

export class ChoiceValue<T> extends Value<T> {
  constructor(private items: ValuePredicate<T>[]) {
    super()
  }
  fold<T1>(
    onRawValue:RawValueNT<T1>,
    onLink: (item: ObjectValue<T> | ChoiceValue<T>, notFoundHandler:(resourceName:string) => T) => T1,
    onObject: (jsConstructor: JsConstructor<T>, properties: JsMap<[string, Value<any>]>, extraPropertiesStrategy: Option<ExtraPropertiesStrategy>) => T1,
    onOption: ValueNT<T1>,
    onSeq: ValueNT<T1>,
    onChoice: (items: ValuePredicate<any>[]) => T1
  ): T1 {
    return onChoice(this.items)
  }
}

export class ValuePredicate<T> {
  constructor(public predicate: (a: any) => boolean, public value: () => Value<T>) {
  }
}

export module NotFoundHandler {

  export function defaultTo<T>(defaultValue:T):(resourceName:string) => T{
    return lazy(() => defaultValue)
  }

  export function raiseNotFoundError<T>():(resourceName:string) => T{
    return (resourceName) => fail<T>(`not found :${resourceName}`)
  }

}

export module Value {

  export const boolean = lazy(() => new SimpleValue<boolean, boolean>(RawValue.boolean))

  export const number = lazy(() => new SimpleValue<number, number>(RawValue.number))

  export const string = lazy(() => new SimpleValue<string, string>(RawValue.string))

  export const getUrl = lazy(() =>  new SimpleValue<Option<string>, string>(RawValue.getUrl.map( (v:Option<string>) => v.getOrElse(() => fail<string>("missing parent url") ))) )

  export function option<T>(item: () => Value<T>) {
    return () => new OptionValue<T>(item)
  }

  export function array<T>(item: () => Value<T>) {
    return () => new ArrayValue<T[]>(item)
  }

  export function link<T>(item: () => ObjectValue<T> | ChoiceValue<T>, notFoundHandler:(resourceName:string) => T = NotFoundHandler.raiseNotFoundError<T>()) {
    return () => new LinkValue<T>(item, notFoundHandler)
  }

  export function optionalLink<T>(item: () => ObjectValue<T> | ChoiceValue<T>) {
    return () => new OptionValue<T>(() => new LinkValue<T>(item, NotFoundHandler.defaultTo<T>(undefined)))
  }

  export function createChoice<T>(items: ValuePredicate<T>[]) {
    return () => new ChoiceValue<T>(items)
  }

  export function choice(items: ValuePredicate<any>[]) {
    return createChoice<any>(items)
  }

  export function object<T>(jsConstructor: JsConstructor<T>, properties: JsMap<(() => Value<any>) | [string, () => Value<any>]>, extraPropertiesStrategy: ExtraPropertiesStrategy = null) {
    const eps = Option.option(extraPropertiesStrategy)
    return () => new ObjectValue<T>(jsConstructor, properties, eps)
  }

}