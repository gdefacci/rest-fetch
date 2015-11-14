import {Option, fail, JsMap} from "flib"
import {link, fetch, convert, Converter, SimpleConverter, Selector, ConstructorType, ByUrlCache} from "../index"

function testOpts(data:JsMap<any>) {
  const testHttpCache = new ByUrlCache()
  Object.keys(data).forEach( k => {
    testHttpCache.store(new Request(k), Promise.resolve(data[k]))
  })

  return {
    httpCache() {
      return testHttpCache;
    }
  }
}

function assert(b: boolean) {
  if (!b) {
    throw new Error("Assertion error");
  }
}

export module Test1 {

  class ResB {
    name2:string
  }

  class ResA {
    name1:string
    @link({ arrayOf: { arrayOf: ResB }})
    resources:ResB[][]
  }

  const data = {
    "/res-a/pippo":{
      name1:"pippo",
      resources:[["/res-b/1", "/res-b/2"], ["/res-b/1"]]
    },
    "/res-b/1":{
      name2:"1"
    },
    "/res-b/2": {
      name2:"2"
    }
  }

  export function test1() {
    const opts = testOpts(data)
    return fetch(ResA, opts).from("/res-a/pippo").then(resa => {
      assert(resa.name1 === "pippo")
      assert(resa.resources.length === 2)
      assert(resa.resources[0].length === 2)
      assert(resa.resources[0][0].name2 === "1")
      assert(resa.resources[0][1].name2 === "2")
      assert(resa.resources[1].length === 1)
      assert(resa.resources[0][0] === resa.resources[1][0])
    })
  }

}

export module Test2 {

  class ResB {
    name2:string
  }

  type ResBOption = Option<ResB>

  class ResA {
    name1:string
    @link({ arrayOf: { optionOf: ResB }})
    resources:ResBOption[]
  }

  const data = {
    "/res-a/pippo":{
      name1:"pippo",
      resources:[undefined, "/res-b/1"]
    },
    "/res-b/1":{
      name2:"1"
    }
  }

  export function test1() {
    const opts = testOpts(data)
    return fetch(ResA, opts).from("/res-a/pippo").then(resa => {
      assert(resa.name1 === "pippo")
      assert(resa.resources.length === 2)
      assert(resa.resources[0].isEmpty())
      assert(resa.resources[1].map( resb => resb.name2 === "1").getOrElse(() => false))
    })
  }

}

export module Test3 {

  interface ResB {
  }

  class ResB_1 implements ResB{
    name2:string
  }

  class ResB_2 implements ResB {
    name3:string
  }

  type ResBOption = Option<ResB>

  const resbChoice = Selector.create( (a:{kind?:string}) => {
    switch(a && a.kind) {
      case "1": return Option.some(ResB_1);
      case "2": return Option.some(ResB_2);
      default: return Option.none<ConstructorType<ResB>>();
    }
  })

  class ResA {
    name1:string
    @link({ arrayOf: { optionOf: resbChoice }})
    resources:ResBOption[]
  }

  const data = {
    "/res-a/pippo":{
      name1:"pippo",
      resources:["/res-b/2", undefined, "/res-b/1"]
    },
    "/res-b/1":{
      "kind":"1",
      name2:"1"
    },
    "/res-b/2":{
      "kind":"2",
      name3:"3"
    }
  }

  export function test1() {
    const opts = testOpts(data)
    return fetch(ResA, opts).from("/res-a/pippo").then(resa => {
      assert(resa.name1 === "pippo")
      assert(resa.resources.length === 3)
      assert(resa.resources[1].isEmpty())
      assert(resa.resources[2].map( resb => (<ResB_1>resb).name2 === "1").getOrElse(() => false))
      assert(resa.resources[2].map( resb => resb instanceof ResB_1 ).getOrElse(() => false))

      assert(resa.resources[0].map( resb => (<ResB_2>resb).name3 === "3").getOrElse(() => false))
      assert(resa.resources[0].map( resb => resb instanceof ResB_2 ).getOrElse(() => false))
    })
  }

}

export module Test4 {

  class ResB {
    name2:string
  }

  type RawResB = { name2:string }

  class Idx {
    constructor(public index:number){}
  }

  const conv1 = new SimpleConverter<RawResB, Idx>(r => new Idx(parseInt(r.name2)))

  class ResA {
    name1:string
    @link({arrayOf:conv1})
    resources:Idx[]
  }

  const data = {
    "/res-a/pippo":{
      name1:"pippo",
      resources:["/res-b/1", "/res-b/2", "/res-b/1"]
    },
    "/res-b/1":{
      name2:"1"
    },
    "/res-b/2": {
      name2:"2"
    }
  }

  export function test1() {
    const opts = testOpts(data)
    return fetch(ResA, opts).from("/res-a/pippo").then(resa => {
      assert(resa.name1 === "pippo")
      assert(resa.resources.length === 3)
      assert(resa.resources[0].index === 1)
      assert(resa.resources[1].index === 2)
      assert(resa.resources[2].index === 1)
      assert(resa.resources[0] === resa.resources[2])
    })
  }

}

export module Test5 {

  const conv1 = SimpleConverter.fromString.andThen( str => {
    switch(str) {
      case "Pippo": return 1
      case "Pluto": return 2
      default: throw new Error(`invalid ${str}`)
    }
  })

  const conv2 = conv1.andThen( idx => idx * 2)

  const upper = SimpleConverter.fromString.andThen( str => {
    return str.toUpperCase()
  })

  class ResA {
    @convert(conv1)
    name:number
  }

  class ResB extends ResA {
    @convert(upper)
    surname:string
  }

  class ResC extends ResA {
    @convert(conv2)
    name:number
    @convert(upper)
    surname:string
  }

  const data = {
    "/res-a/pippo":{
      name:"Pippo",
      surname:"surname",
    }
  }

  export function test1() {
    const opts = testOpts(data)
    return fetch(ResB, opts).from("/res-a/pippo").then(resa => {
      assert(resa.name === 1)
      assert(resa.surname === "SURNAME")
    })
  }

  export function test2() {
    const opts = testOpts(data)
    return fetch(ResC, opts).from("/res-a/pippo").then(resa => {
      assert(resa.name === 2)
      assert(resa.surname === "SURNAME")
    })
  }
}

export module Test6 {

  class Item1 {
     name:string
   }

   class Item2 extends Item1 {
     name:string
     age:number
   }

  class ResA {
    @link({ arrayOf:Item1 })
    items:Item1[]
  }

  class ResB extends ResA {
    @link({ arrayOf:Item2 })
    items:Item2[]
  }

  const data = {
    "/res-a/pippo":{
      items:["/item/1", "/item/2"],
    },
    "/res-a/pluto":{
      items:["/item/3", "/item/4"],
    },
    "/item/1":{
      name:"1"
    },
    "/item/2":{
      name:"2"
    },
    "/item/3":{
      name:"3",
      age:3
    },
    "/item/4":{
      name:"4",
      age:4
    }
  }

  export function test1() {
    const opts = testOpts(data)
    return fetch(ResA, opts).from("/res-a/pippo").then(resa => {
      assert( resa.items[0].name === "1" )
      assert( resa.items[1].name === "2" )
    })
  }

  export function test2() {
    const opts = testOpts(data)
    return fetch(ResB, opts).from("/res-a/pluto").then(resa => {
      assert( resa.items[0].name === "3" )
      assert( resa.items[0].age === 3 )
      assert( resa.items[1].name === "4" )
      assert( resa.items[1].age === 4 )
    })
  }
}
