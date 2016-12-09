import {Option} from "flib"
import {Value, ObjectValue, ValuePredicate, ExtraPropertiesStrategy} from "../lib/model"
import TestFetcher from "../lib/TestFetcher"

const fetcher = new TestFetcher(ExtraPropertiesStrategy.fail)
const promisesMap = TestFetcher.promisesMap

describe("object mappings", function () {

  describe("simple", () => {

    class Person {
      name: string
      age: number
      petOwner: boolean
    }

    const personMapping = Value.object(Person, ({ "name": Value.string, "age": Value.number, "petOwner": Value.boolean }))

    const cache1 = promisesMap({
      "/person/1": {
        "name": "pippo",
        "age": 12,
        petOwner: true
      }
    })

    it('Person', (done) => {
      fetcher.fetchResource("/person/1", personMapping, cache1)( v => {
        expect(v instanceof Person).toBe(true)
        expect(v.name).toBe("pippo")
        expect(v.age).toBe(12)
        expect(v.petOwner).toBe(true)
        done()
      })
    });

    const personMappingRename = Value.object(Person,  ({ "name": ["_name",Value.string], "age": ["_age",Value.number], "petOwner": ["_petOwner",Value.boolean] }))

    const cache1Raname = promisesMap({
      "/person/1": {
        "_name": "pippo",
        "_age": 12,
        _petOwner: true
      }
    })

    it('Person rename', (done) => {
      fetcher.fetchResource("/person/1", personMappingRename, cache1Raname)( v => {
        expect(v instanceof Person).toBe(true)
        expect(v.name).toBe("pippo")
        expect(v.age).toBe(12)
        expect(v.petOwner).toBe(true)
        done()
      })
    });

  })

  describe("simple rename", () => {

    class Person {
      name: string
      age: number
      petOwner: boolean
    }

    const personMapping = Value.object(Person, ({ "name": ["_name",Value.string], "age": ["_age",Value.number], "petOwner": ["_petOwner",Value.boolean] }))

    const cache1 = promisesMap({
      "/person/1": {
        "_name": "pippo",
        "_age": 12,
        _petOwner: true
      }
    })

    it('Person', (done) => {
      fetcher.fetchResource("/person/1", personMapping, cache1)( v => {
        expect(v instanceof Person).toBe(true)
        expect(v.name).toBe("pippo")
        expect(v.age).toBe(12)
        expect(v.petOwner).toBe(true)
        done()
      })
    });

  })

  describe("array", () => {

    const cache2 = promisesMap({
      "/team/1": {
        name: "team1",
        members: [{
          "name": "pippo",
          "age": 12
        }, {
            "name": "pluto",
            "age": 11
          }]
      }
    })

    class Person {
      name: string
      age: number
    }

    class Team {
      name: string
      members: Person[]
    }

    const personMapping = Value.object(Person, ({ "name": Value.string, "age": Value.number }))

    const teamMapping = Value.object(Team, ({ "name": Value.string, "members": Value.array(personMapping) }))

    it('Team', (done) => {
      fetcher.fetchResource("/team/1", teamMapping, cache2)( v => {
        expect(v instanceof Team).toBe(true)
        expect(v.name).toBe("team1")
        expect(v.members.length).toBe(2)

        expect(v.members[0] instanceof Person).toBe(true)
        expect(v.members[0].name).toBe("pippo")
        expect(v.members[0].age).toBe(12)

        expect(v.members[1] instanceof Person).toBe(true)
        expect(v.members[1].name).toBe("pluto")
        expect(v.members[1].age).toBe(11)

        done()
      })
    });

  })

  describe("option", () => {

    const cache3 = promisesMap({
      "/person1/1": {
        name: "pluto",
        friend: {
          "name": "pippo"
        },
      },
      "/person1/2": {
        name: "lone"
      },
      "/person1/3": {
        name: "minni",
        friend: {
          "name": "zorro",
          friend: {
            name: "batman"
          }
        }
      }
    })

    class Person1 {
      name: string
      friend: Option<Person1>
    }

    const person1Mapping1: () => ObjectValue<Person1> = Value.object(Person1, ({ "name": Value.string, "friend": Value.option( () => person1Mapping1() ) }))

    it('Person1 pluto', (done) => {
      fetcher.fetchResource("/person1/1", person1Mapping1, cache3)( v => {
        expect(v instanceof Person1).toBe(true)
        expect(v.name).toBe("pluto")
        expect(v.friend.toArray()[0].name).toBe("pippo")

        done()
      })
    });

    it('Person1 lone', (done) => {
      fetcher.fetchResource("/person1/2", person1Mapping1, cache3)( v => {
        expect(v instanceof Person1).toBe(true)
        expect(v.name).toBe("lone")
        expect(v.friend.isEmpty()).toBe(true)
        done()
      })
    });

    it('Person1 minni', (done) => {
      fetcher.fetchResource("/person1/3", person1Mapping1, cache3)( v => {
        expect(v instanceof Person1).toBe(true)
        expect(v.name).toBe("minni")
        expect(v.friend.toArray()[0].name).toBe("zorro")
        expect(v.friend.toArray()[0].friend.toArray()[0].name).toBe("batman")
        done()
      })
    });

  })

  describe("link option", () => {
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

    class Person1 {
      name: string
      friend: Option<Person1>
    }

    const person1Mapping1: () => ObjectValue<Person1> = Value.object(Person1, ({ "name": Value.string, "friend":  Value.option(Value.link(() => person1Mapping1())) }))

    it('Person1 pluto', (done) => {
      fetcher.fetchResource("/person1/1", person1Mapping1, cache3)( v => {
        expect(v instanceof Person1).toBe(true)
        expect(v.name).toBe("pluto")
        expect(v.friend.toArray()[0].name).toBe("pippo")

        done()
      })
    });

    it('Person1 lone', (done) => {
      fetcher.fetchResource("/person1/2", person1Mapping1, cache3)( v => {
        expect(v instanceof Person1).toBe(true)
        expect(v.name).toBe("lone")
        expect(v.friend.isEmpty()).toBe(true)
        done()
      })
    });

    it('Person1 minni', (done) => {
      fetcher.fetchResource("/person1/3", person1Mapping1, cache3)( v => {
        expect(v instanceof Person1).toBe(true)
        expect(v.name).toBe("minni")
        expect(v.friend.toArray()[0].name).toBe("zorro")
        expect(v.friend.toArray()[0].friend.toArray()[0].name).toBe("batman")
        done()
      })
    });

    it('Person1 loop', (done) => {
      fetcher.fetchResource("/person1/7", person1Mapping1, cache3)( v => {
        expect(v instanceof Person1).toBe(true)
        expect(v.name).toBe("loop")
        expect(v.friend.toArray()[0].name).toBe("loop")
        expect(v.friend.toArray()[0]).toBe(v)
        done()
      })
    });

  });

  describe("array of links", () => {

    const cache2 = promisesMap({
      "/team/1": {
        name: "team1",
        members: ["/person/1", "/person/2"]
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

    class Person {
      name: string
      age: number
    }

    class Team {
      name: string
      members: Person[]
    }

    const personMapping = Value.object(Person, ({ "name": Value.string, "age": Value.number }))

    const teamMapping = Value.object(Team, ({ "name": Value.string, "members": Value.array(Value.link( personMapping)) }))

    it('Team', (done) => {
      fetcher.fetchResource("/team/1", teamMapping, cache2)( v => {
        expect(v instanceof Team).toBe(true)
        expect(v.name).toBe("team1")
        expect(v.members.length).toBe(2)

        expect(v.members[0] instanceof Person).toBe(true)
        expect(v.members[0].name).toBe("pippo")
        expect(v.members[0].age).toBe(12)

        expect(v.members[1] instanceof Person).toBe(true)
        expect(v.members[1].name).toBe("pluto")
        expect(v.members[1].age).toBe(11)

        done()
      })
    });

  })

  describe("choice", () => {

    class Dog {
      bau:string
    }

    class Cat {
      meow:string
    }

    const cache2 = promisesMap({
      "/pet/1": {
        meow: "meeehe"
      },
      "/pet/2":{
        bau: "buuhu"
      }
    })

    const catMapping = Value.object(Cat, ({ "meow" : Value.string }) )
    const dogMapping = Value.object(Dog, ({ "bau" : Value.string }) )
    const petMapping = Value.choice("Pet",[new ValuePredicate( a => a.meow !== undefined, catMapping ), new ValuePredicate( a => a.bau !== undefined, dogMapping )] )

    it('Pet1', (done) => {
      fetcher.fetchResource("/pet/1", petMapping, cache2)( v => {
        expect(v instanceof Cat).toBe(true)
        expect(v.meow).toBe("meeehe")
        done()
      })
    });

    it('Pet2', (done) => {
      fetcher.fetchResource("/pet/2", petMapping, cache2)( v => {
        expect(v instanceof Dog).toBe(true)
        expect(v.bau).toBe("buuhu")
        done()
      })
    });

  })

  describe("array of link choices", () => {

    interface Pet {
    }

    class Dog {
      bau:string
    }

    class Cat {
      meow:string
    }

    class Pets {
      pets:Pet[]
    }

    const cache2 = promisesMap({
      "/pet/1": {
        meow: "meeehe"
      },
      "/pet/2":{
        bau: "buuhu"
      },
      "/pets/1":{
        pets:["/pet/1", "/pet/2"]
      }
    })

    const catMapping = Value.object(Cat, ({ "meow" : Value.string }) )
    const dogMapping = Value.object(Dog, ({ "bau" : Value.string }) )
    const petMapping = Value.choice("Pet", [new ValuePredicate( a => a.meow !== undefined, catMapping ), new ValuePredicate( a => a.bau !== undefined, dogMapping )])
    const petsMapping = Value.object(Pets, ({ "pets" : Value.array( Value.link( petMapping ) ) }) )

    it('Pets', (done) => {
      fetcher.fetchResource("/pets/1", petsMapping, cache2)( v => {
        expect(v instanceof Pets).toBe(true)
        expect(v.pets.length).toBe(2)
        expect(v.pets[0] instanceof Cat).toBe(true)
        expect(v.pets[1] instanceof Dog).toBe(true)
        done()
      })
    });

  })

  describe("get url properties", () => {
    class Dog {
      bau:string
      self:string
    }

    class Cat {
      meow:string
      self:string
    }

    type Pet = Cat | Dog

    class Pets {
      self:Option<string>
      pets:Pet[]
    }

    const cache2 = promisesMap({
      "/pet/1": {
        meow: "meeehe"
      },
      "/pet/2":{
        bau: "buuhu"
      },
      "/pets/1":{
        pets:["/pet/1", "/pet/2"]
      }
    })

    const catMapping = Value.object(Cat, ({ "meow" : Value.string, "self" : Value.getUrl }))
    const dogMapping = Value.object(Dog, ({ "bau" : Value.string, "self" : Value.getUrl }) )
    const petMapping = Value.choice("Pet", [
      Value.match( a => a.meow !== undefined)(catMapping),
      Value.match( a => a.bau !== undefined)(dogMapping)
    ])
    const petsMapping = Value.object(Pets, ({ "pets" : Value.array( Value.link( petMapping ) ), "self" : Value.option( Value.getUrl ) }) )

    it('Cat', (done) => {
      fetcher.fetchResource("/pet/1", catMapping, cache2)( v => {
        expect(v instanceof Cat).toBe(true)
        expect(v.self).toBe("/pet/1")
        done()
      })
    });

    it('Pets', (done) => {
      fetcher.fetchResource("/pets/1", petsMapping, cache2)( v => {
        expect(v instanceof Pets).toBe(true)
        expect(v.pets.length).toBe(2)
        expect(v.self.toArray()[0]).toBe("/pets/1")
        const pet1 = <Cat>v.pets[0]
        expect(pet1 instanceof Cat).toBe(true)
        expect(pet1.self).toBe("/pet/1")
        const pet2 = <Dog>v.pets[1]
        expect(pet2 instanceof Dog).toBe(true)
        expect(pet2.self).toBe("/pet/2")
        done()
      })
    });

  })

})