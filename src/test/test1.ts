import {Option, fail} from "flib"
import {link, fetch, convert, Converter, SimpleConverter, Selector, ConstructorType, ByUrlCache} from "../index"
import * as test2 from "./test2"

export class City {
  name: string

  extra1 = "an extra field"
}

const cityChoice = Selector.create( (wso:{ kind:string }) => {
  switch (wso.kind) {
    case CitySize[CitySize.big]: return Option.some(BigCity)
    case CitySize[CitySize.small]: return Option.some(SmallCity)
    default: Option.none();
  }
})

class BigCity extends City {
  bigCity = true
}

class SmallCity extends City {
  smallCity = true

  @link({ optionOf:cityChoice })
  self:Option<City>
}

enum CitySize {
  big, small
}

export class Address {
  street: string

  @link(cityChoice)
  city: City
}

export module Mod1 {

  export class City {
    extra = 746

    name: string
  }

  export class Person {
    static __name = "Person1"

    name: string

    @convert({ property: "friends" })
    contacts: string[]

    @link({ property: "address" })
    homeAddress: Address

    @link()
    doctor: Person

    get favCity() : string {
      return "reserved"
    }
  }
}

export enum Color {
  white, black, red
}

//const stringToColor = Converter.fromString.map(Converter.toEnum<Color>(Color, "color"))
const stringToColor = SimpleConverter.fromString.andThen(Converter.toEnum(Color, "color"))

export class Person {
  static __name = "Person0"

  name: string

  @convert(stringToColor, { property: "favouriteColor" })
  favColor: Color

  @link({ arrayOf: Person })
  friends: Person[]

  @link({ arrayOf: Mod1.Person, property: "friends" })
  contacts: Mod1.Person[]

  @link()
  address: Address

  @link()
  favCity: Mod1.City

  @link()
  doctor: Mod1.Person
}

function assert(b: boolean) {
  if (!b) {
    throw new Error("Assertion error");
  }
}

export function test0(data) {

  const testHttpCache = new ByUrlCache()
  Object.keys(data).forEach( k => {
    testHttpCache.store(new Request(k), Promise.resolve(data[k]))
  })

  const testFetchOpts = {
    httpCache() {
      return testHttpCache;
    }
  }

  return fetch(Person, testFetchOpts).from("http://localhost:8080/persons/pippo").then(pers => {
      pers.name = pers.name + " qua"

      assert(pers.friends[0].name === "minni")
      assert(pers.friends[0].friends[0] === pers)
      assert(pers.friends[0].friends[0].name === "pippo qua")
      const ct = pers.address.city
      assert(ct instanceof SmallCity && ct.self.isEmpty())
      assert(pers.favColor === Color.red)
      assert(pers.address.city.name === "RE")

    })
}

const data = {
  "http://localhost:8080/persons/qua" : {
    "name" : "qua",
    "favCity" : "http://localhost:8080/cities/MI",
    "doctor" : "http://localhost:8080/persons/pippo",
    "friends" : [
      "http://localhost:8080/persons/qua"
    ],
    "address" : "http://localhost:8080/persons/qua/address",
    "favouriteColor" : "black"
  },
  "http://localhost:8080/persons/pippo":{
    "name" : "pippo",
    "favCity" : "http://localhost:8080/cities/RE",
    "doctor" : "http://localhost:8080/persons/paperoga",
    "friends" : [
      "http://localhost:8080/persons/minni"
    ],
    "address" : "http://localhost:8080/persons/pippo/address",
    "favouriteColor" : "red"
  },
  "http://localhost:8080/persons/paperoga":{
    "name" : "paperoga",
    "favCity" : "http://localhost:8080/cities/RE",
    "doctor" : "http://localhost:8080/persons/paperoga",
    "friends" : [
      "http://localhost:8080/persons/minni",
      "http://localhost:8080/persons/pippo"
    ],
    "address" : "http://localhost:8080/persons/paperoga/address",
    "favouriteColor" : "white"
  },
  "http://localhost:8080/persons/minni":{
    "name" : "minni",
    "favCity" : "http://localhost:8080/cities/RE",
    "doctor" : "http://localhost:8080/persons/paperoga",
    "friends" : [
      "http://localhost:8080/persons/pippo"
    ],
    "address" : "http://localhost:8080/persons/minni/address",
    "favouriteColor" : "white"
  },

  "http://localhost:8080/persons/qua/address":{
    "street" : "circolare",
    "city" : "http://localhost:8080/cities/MI"
  },
  "http://localhost:8080/persons/pippo/address":{
    "street" : "dei pomi",
    "city" : "http://localhost:8080/cities/RE"
  },
  "http://localhost:8080/persons/minni/address":{
    "street" : "dei tigli",
    "city" : "http://localhost:8080/cities/MI"
  },
  "http://localhost:8080/persons/paperoga/address":{
    "street" : "delle rose",
    "city" : "http://localhost:8080/cities/DO"
  },

  "http://localhost:8080/cities/DO":{
    "name" : "DO",
    "kind" : "small",
    "self": "http://localhost:8080/cities/DO"
  },
  "http://localhost:8080/cities/RE":{
    "name" : "RE",
    "kind" : "small"
  },
  "http://localhost:8080/cities/MI":{
    "name" : "MI",
    "kind" : "big"
  }
}

export function test1() {
  const promises: Promise<void>[] = []

  const testHttpCache = new ByUrlCache()
  Object.keys(data).forEach( k => {
    testHttpCache.store(new Request(k), Promise.resolve(data[k]))
  })

  const testFetchOpts = {
    httpCache() {
      return testHttpCache;
    }
  }

  promises.push(
    fetch(Person, testFetchOpts).from("http://localhost:8080/persons/qua").then(pers => {
      pers.name = "qua qua"
      assert(pers.friends[0].name === "qua qua")
      assert(pers.friends[0] === pers)
      assert(pers.contacts[0].name === "qua")
      assert(pers.contacts[0].homeAddress === pers.address)
      assert(pers.favColor === Color.black)
      const ct = pers.address.city
      assert(ct.name === "MI")
      assert(pers.address.city.extra1 === "an extra field")
      assert(pers.favCity.name === "MI")
      assert(pers.favCity.extra === 746)
      assert(pers.doctor.name === "pippo")
      assert(pers.doctor.favCity  === "reserved")
      assert(pers.doctor.contacts[0] === "http://localhost:8080/persons/minni")
      assert(pers.doctor.homeAddress.street === "dei pomi")
    })
  )

  promises.push(
    fetch(Mod1.City, testFetchOpts).from("http://localhost:8080/cities/MI").then(ct => {
      assert(ct.name === "MI")
      assert(ct.extra === 746)
    })
  )

  promises.push(
    fetch(City, testFetchOpts).from("http://localhost:8080/cities/MI").then(ct => {
      assert(ct.name === "MI")
      assert(ct.extra1 === "an extra field")
    })
  )

  promises.push(
    fetch(Person, testFetchOpts).from("http://localhost:8080/persons/pippo").then(pers => {
      pers.name = pers.name + " qua"

      assert(pers.friends[0].name === "minni")
      assert(pers.friends[0].friends[0] === pers)
      assert(pers.friends[0].friends[0].name === "pippo qua")
      const ct = pers.address.city
      assert(ct instanceof SmallCity && ct.self.isEmpty())
      assert(pers.favColor === Color.red)
      assert(pers.address.city.name === "RE")

    })
  )
  promises.push(
    fetch(Person, testFetchOpts).from("http://localhost:8080/persons/minni").then(pers => {
      pers.name = pers.name + " qua"

      assert(pers.friends[0].name === "pippo")
      assert(pers.friends[0].friends[0] === pers)
      assert(pers.friends[0].friends[0].name === "minni qua")
      assert(pers.favColor === Color.white)
      assert(pers.address.city.name === "MI")
    })
  )

  promises.push(
    fetch(Person, testFetchOpts).from("http://localhost:8080/persons/paperoga").then(pers => {
      const ct = pers.address.city
      assert(ct instanceof SmallCity && ct.self.map( ct1 => ct1 === ct).getOrElse(() => false))
    })
  )


  return Promise.all(promises)
}