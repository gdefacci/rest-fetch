import {Option, fail as ufail } from "flib"
import {ExtraPropertiesStrategy, Value} from "../lib/model"
import {mapping, lazyMapping} from "../lib/Mappings"
import {promisesMap, TestFetcher} from "./TestHelper"

import {link, convert} from "../lib/annotations"

import "reflect-metadata"

const fetcher = new TestFetcher(ExtraPropertiesStrategy.fail)

describe("object annotations mappings", function () {

  describe("convert simple", () => {

    class Person {
      @convert()
      name: string
      @convert()
      age: number
      @convert()
      petOwner: boolean
    }

    const cache1 = promisesMap({
      "/person/1": {
        "name": "pippo",
        "age": 12,
        petOwner: true
      }
    })

    it('Person', (done) => {
      fetcher.fetchResource("/person/1", mapping(Person), cache1)( v => {
        expect(v instanceof Person).toBe(true)
        expect(v.name).toBe("pippo")
        expect(v.age).toBe(12)
        expect(v.petOwner).toBe(true)
        done()
      })
    });

  })

  describe("convert simple map", () => {

    class Person {
      @convert(() => Value.string().map( i => "zbbbr" + i))
      name: string
      @convert(() => Value.number().map( i => i * 2))
      age: number
      @convert(() => Value.boolean().map( i => !i ))
      petOwner: boolean
    }

    const cache1 = promisesMap({
      "/person/1": {
        "name": "pippo",
        "age": 12,
        petOwner: true
      }
    })

    it('Person', (done) => {
      fetcher.fetchResource("/person/1", mapping(Person), cache1)( v => {
        expect(v instanceof Person).toBe(true)
        expect(v.name).toBe("zbbbrpippo")
        expect(v.age).toBe(24)
        expect(v.petOwner).toBe(false)
        done()
      })
    });

  })

  describe("convert type inference", () => {

    class Person {
      @convert()
      name: string
      @convert()
      age: number
      @convert()
      petOwner: boolean
    }

    class Pet {
      @convert()
      name:string
      @convert()
      person:Person
    }

    const cache1 = promisesMap({
      "/pet/1": {
        "name": "rocky",
        "person": {
          "name": "pippo",
          "age": 12,
          "petOwner": true
        }
      }
    })

    it('Pet', (done) => {
      fetcher.fetchResource("/pet/1", mapping(Pet), cache1)( v => {
        expect(v instanceof Pet).toBe(true)
        expect(v.name).toBe("rocky")
        expect(v.person.name).toBe("pippo")
        expect(v.person.age).toBe(12)
        expect(v.person.petOwner).toBe(true)
        done()
      })
    });

  })



  describe("convert simple with lazyness", () => {

    class Pet {
      @convert()
      name:string
      /** Person is not defined when the annotation is evaluated */
      @convert(lazyMapping(() => Person))
      person:Person
    }

    class Person {
      @convert()
      name: string
      @convert()
      age: number
      @convert()
      petOwner: boolean
    }

    const cache1 = promisesMap({
      "/pet/1": {
        "name": "rocky",
        "person": {
          "name": "pippo",
          "age": 12,
          "petOwner": true
        }
      }
    })

    it('Pet', (done) => {
      fetcher.fetchResource("/pet/1", mapping(Pet), cache1)( v => {
        expect(v instanceof Pet).toBe(true)
        expect(v.name).toBe("rocky")
        expect(v.person.name).toBe("pippo")
        expect(v.person.age).toBe(12)
        expect(v.person.petOwner).toBe(true)
        done()
      })
    });

  })

  describe("link simple with lazyness", () => {

    class Pet {
      @convert()
      name:string
      /** Person is not defined when the annotation is evaluated */
      @link(lazyMapping(() => Person))
      person:Person
    }

    class Person {
      @convert()
      name: string
      @convert()
      age: number
      @convert()
      petOwner: boolean
    }

    const cache1 = promisesMap({
      "/pet/1": {
        "name": "rocky",
        "person": "/person/1"
      },
      "/person/1":{
        "name": "pippo",
        "age": 12,
        "petOwner": true
      }
    })

    it('Pet', (done) => {
      fetcher.fetchResource("/pet/1", mapping(Pet), cache1)( v => {
        expect(v instanceof Pet).toBe(true)
        expect(v.name).toBe("rocky")
        expect(v.person.name).toBe("pippo")
        expect(v.person.age).toBe(12)
        expect(v.person.petOwner).toBe(true)
        done()
      })
    });

  })

  describe("optional link", () => {

    class Person {
      @convert()
      name: string
      @convert()
      age: number
      @convert()
      petOwner: boolean
    }

    class Pet {
      @convert()
      name:string
      @link(Value.option(mapping(Person)))
      person:Option<Person>
    }

    const cache1 = promisesMap({
      "/pet/1": {
        "name": "rocky",
        "person": "/person/1"
      },
      "/pet/2": {
        "name": "randy"
      },
      "/person/1":{
        "name": "pippo",
        "age": 12,
        "petOwner": true
      }
    })

    it('Pet rocky', (done) => {
      fetcher.fetchResource("/pet/1", mapping(Pet), cache1)( v => {
        expect(v instanceof Pet).toBe(true)
        expect(v.name).toBe("rocky")
        const pers = v.person.toArray()[0]
        expect(pers.name).toBe("pippo")
        expect(pers.age).toBe(12)
        expect(pers.petOwner).toBe(true)
        done()
      })
    });

    it('Pet randy', (done) => {
      fetcher.fetchResource("/pet/2", mapping(Pet), cache1)( v => {
        expect(v instanceof Pet).toBe(true)
        expect(v.name).toBe("randy")
        expect(v.person.isEmpty()).toBe(true)
        done()
      })
    });

  })

  describe("arrays of link", () => {

    class Person {
      @convert()
      name: string
      @convert()
      age: number
    }

    class Pet {
      @convert()
      name:string
      @convert( Value.array( Value.link(mapping(Person)) ) )
      persons:Person[]
    }

    const cache1 = promisesMap({
      "/pet/1": {
        "name": "rocky",
        "persons": ["/person/1", "/person/2"]
      },
      "/person/1":{
        "name": "pippo",
        "age": 12
      },
      "/person/2":{
        "name": "pluto",
        "age": 11
      }
    })

    it('Pet rocky', (done) => {
      fetcher.fetchResource("/pet/1", mapping(Pet), cache1)( v => {
        expect(v instanceof Pet).toBe(true)
        expect(v.name).toBe("rocky")
        const perss = v.persons
        expect(perss.length).toBe(2)
        const p0 = perss[0]
        expect(p0.name).toBe("pippo")
        expect(p0.age).toBe(12)
        const p1 = perss[1]
        expect(p1.name).toBe("pluto")
        expect(p1.age).toBe(11)
        done()
      })
    });

  })

  describe("self optional link", () => {
    class Person1 {
      @convert()
      name: string
      @link(Value.option(mapping(Person1)))
      friend: Option<Person1>
    }

    const cache3 = promisesMap({
      "/person1/1": {
        name: "pluto",
        friend: "/person1/4",
      },
      "/person1/2": {
        name: "lone"
      },
      "/person1/3": {
        name: "minni",
        friend: "/person1/5"
      },
      "/person1/4": {
        "name": "pippo",
      },
      "/person1/5": {
        "name": "zorro",
        friend: "/person1/6"
      },
      "/person1/6": {
        name: "batman"
      },
      "/person1/7": {
        name: "loop",
        friend: "/person1/7"
      }
    })

    it('Person1 pluto', (done) => {
      fetcher.fetchResource("/person1/1", mapping(Person1), cache3)( v => {
        expect(v instanceof Person1).toBe(true)
        expect(v.name).toBe("pluto")
        expect(v.friend.toArray()[0].name).toBe("pippo")

        done()
      })
    });

    it('Person1 lone', (done) => {
      fetcher.fetchResource("/person1/2", mapping(Person1), cache3)( v => {
        expect(v instanceof Person1).toBe(true)
        expect(v.name).toBe("lone")
        expect(v.friend.isEmpty()).toBe(true)
        done()
      })
    });

    it('Person1 minni', (done) => {
      fetcher.fetchResource("/person1/3", mapping(Person1), cache3)( v => {
        expect(v instanceof Person1).toBe(true)
        expect(v.name).toBe("minni")
        expect(v.friend.toArray()[0].name).toBe("zorro")
        expect(v.friend.toArray()[0].friend.toArray()[0].name).toBe("batman")
        done()
      })
    });

    it('Person1 loop', (done) => {
      fetcher.fetchResource("/person1/7", mapping(Person1), cache3)( v => {
        expect(v instanceof Person1).toBe(true)
        expect(v.name).toBe("loop")
        expect(v.friend.toArray()[0].name).toBe("loop")
        expect(v.friend.toArray()[0]).toBe(v)
        done()
      })
    });

  });

})