import {JsMap, Option, fail as ufail } from "flib"
import {ExtraPropertiesStrategy, Value} from "../lib/model"
import {mapping, lazyMapping} from "../lib/Mappings"
import {promisesMap, TestFetcher} from "./TestHelper"

import {link, convert, fetchProperties} from "../lib/annotations"

import "reflect-metadata"

const fetcher = new TestFetcher(ExtraPropertiesStrategy.fail)
const nop:() =>void = () => null

describe("ExtraPropertiesStrategy", function () {

  const cache = promisesMap({
    "/person/1": {
      "name": "pippo"
    }
  })

  describe("copy", () => {

    @fetchProperties({ extraPropertiesStrategy: ExtraPropertiesStrategy.copy })
    class Person {
      name: string
    }

    it('Person', (done) => {
      fetcher.fetchResource("/person/1", mapping(Person), cache)(v => {
        expect(v.name).toBe("pippo");
        done()
      })
    });

  })

  describe("discard", () => {

    @fetchProperties({ extraPropertiesStrategy: ExtraPropertiesStrategy.discard })
    class PersonDiscard {
      name: string
    }

    it('Person', (done) => {
      fetcher.fetchResource("/person/1", mapping(PersonDiscard), cache)(v => {
        expect(v.name).not.toBeDefined();
        done()
      })
    });

  })

  describe("fail", () => {

    @fetchProperties({ extraPropertiesStrategy: ExtraPropertiesStrategy.fail })
    class PersonFail {
      name: string
    }

    it('Person', (done) => {
      fetcher.fetchFails("/person/1", mapping(PersonFail), cache)(err => {
        done()
      })
    });

  })

})

describe("inconsitent types", () => {

  describe("Option converter", () => {

    class Person1 {
      @convert(Value.option(mapping(Person1)))
      name:number
    }

    it('Person', (done) => {
      expect( () => mapping(Person1)().fold(nop, nop, nop, nop, nop, nop) ).toThrow(new Error("Property 'name' of Person1: expecting option got Number"))
      done()
    });

  })

  describe("Array converter", () => {

    class Person1 {
      @convert(Value.array(mapping(Person1)))
      name:number
    }

    it('Person', (done) => {
      expect( () => mapping(Person1)().fold(nop, nop, nop, nop, nop, nop) ).toThrow(new Error("Property 'name' of Person1: expecting array got Number"))
      done()
    });

  })

  describe("object converter", () => {

    class Person1 {
      @convert(mapping(Person1))
      name:number
    }

    it('Person', (done) => {
      expect( () => mapping(Person1)().fold(nop, nop, nop, nop, nop, nop) ).toThrow(new Error("Property 'name' of Person1: expecting object got Number"))
      done()
    });

  })

  describe("Option link", () => {

    class Person1 {
      @link(Value.option(mapping(Person1)))
      name:number
    }

    it('Person', (done) => {
      expect( () => mapping(Person1)().fold(nop, nop, nop, nop, nop, nop) ).toThrow(new Error("Property 'name' of Person1: expecting option got Number"))
      done()
    });

  })

  describe("object link", () => {

    class Person1 {
      @link(mapping(Person1))
      name:number
    }

    it('Person', (done) => {
      expect( () => mapping(Person1)().fold( nop, nop, nop, nop, nop, nop) ).toThrow(new Error("Property 'name' of Person1: expecting object got Number"))
      done()
    });

  })

  describe("array link no args", () => {

    it('Person', (done) => {
      expect( () => {

        class Person1 {
          @link()
          name:Person1[]
        }

      } ).toThrow(new Error("Property 'name' of Person1: expecting a link got Array"))
      done()
    });

  })

})

describe("cant infer type", () => {

  describe("option link", () => {

    it('Person', (done) => {
      expect( () => {

        class Person1 {
          @link()
          name:Option<Person1>
        }

      } ).toThrow(new Error("Property 'name' of Person1: cant infer link type"))
      done()
    });

  })

  describe("option converter", () => {

    it('Person', (done) => {
      expect( () => {

        class Person1 {
          @convert()
          name:Option<Person1>
        }

      } ).toThrow(new Error("Property 'name' of Person1: cant infer type"))
      done()
    });

  })

  describe("array converter", () => {

    it('Person', (done) => {
      expect( () => {

        class Person1 {
          @convert()
          name:Person1[]
        }

      } ).toThrow(new Error("Property 'name' of Person1: cant infer type"))
      done()
    });

  })

})