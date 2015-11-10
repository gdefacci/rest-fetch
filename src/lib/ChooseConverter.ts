import {ChooseConverterJsType} from "./types"
import {lazy, Arrays, Option, JsMap, isNull} from "flib"

export class ChooseConverter implements ChooseConverter {
  constructor(public convert:(a:any) => Option<ChooseConverterJsType<any>>, public description?:string) {
  }
  or(cnv:ChooseConverter, description?:string):ChooseConverter {
    const self = this
    return new ChooseConverter( a => {
      return self.convert(a).fold<Option<ChooseConverterJsType<any>>>(
        () => cnv.convert(a),
        (v) => Option.some(v)
      )
    }, description)
  }
}

export module ChooseConverter {

  export function create(f:(a:any) => Option<ChooseConverterJsType<any>>, description?:string):ChooseConverter {
    return new ChooseConverter(f, description)
  }

  export function value(ct:ChooseConverterJsType<any>):ChooseConverter {
    return create(a => Option.some(ct))
  }

  export function byPropertyExists(entries:JsMap.Entry<ChooseConverterJsType<any>>[], description?:string) {
    return new ChooseConverter(
      ws => Arrays.find(entries, e => !isNull(ws[e.key])).map(e => e.value),
      description)
  }

}

export class ByPropertyChooseConverter extends ChooseConverter {
  constructor(prop:(a:any) => string, private jsMap:() => JsMap<ChooseConverterJsType<any>>, desc:string) {
    super( (a) => {
      const pv = prop(a)
      return Option.option(jsMap()[pv]);
    }, desc )
  }
  contains(nm:string):boolean {
    return !isNull(this.jsMap()[nm])
  }
}

export module ByPropertyChooseConverter {

  export function fromEntries(prop:(a:any) => string, bks:() => JsMap.Entry<ChooseConverterJsType<any>>[], desc:string) {
    const mp = lazy( () => JsMap.create(bks()))
    return new ByPropertyChooseConverter(prop, mp, desc)
  }

}