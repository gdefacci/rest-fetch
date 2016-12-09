import { ResourceFetch, mapping, TestFetcher, ExtraPropertiesStrategy } from "../index"
import { Person } from "../samples/person/model"
import { PersonImpl } from "../samples/person/impl"

describe("readme specification", () => {

  const testCache = TestFetcher.promisesMap({
    "/persons/pippo": {
      "name": "pippo",
      "friends": [
        "/persons/minni"
      ],
      "address": "/persons/pippo/address"
    },
    "/persons/minni": {
      "name": "minni",
      "friends": [
        "/persons/pippo"
      ],
      "address": "/persons/pippo/address"
    },
    "/cities/RE": {
      "name": "RE"
    },
    "/persons/pippo/address": {
      "street": "dei pomi",
      "city": "/cities/RE"
    }
  })

  it("can fetch pippo sucessfully", (done) => {

    const rf = new ResourceFetch(ExtraPropertiesStrategy.copy, () => testCache)
    const result: Promise<Person> = rf.fetchResource("/persons/pippo", mapping(PersonImpl))

    result.then(r => {
      expect(r.name).toBe("pippo")
      expect(r.friends.length).toBe(1)
      expect(r.friends[0].name).toBe("minni")
      expect(r.friends[0].friends[0]).toBe(r)
      done()
    }, err => {
      expect(err && err.toString()).toBeUndefined()
      done()
    })

  })

})