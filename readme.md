A annotations based typescript library, to fetch graph of objects, exposed as rest/HATEOAS resources.

tutorial
========

Suppose we have 2 resources, persons and cities, and persons has a subresource address:

```
GET /persons/pippo
```

```json
{
  "name" : "pippo",
  "friends" : [
    "/persons/minni"
  ],
  "address" : "/persons/pippo/address"
}
```

```
GET /cities/RE
```

```json
{
  "name" : "RE"
}
```

```
GET /persons/pippo/address
```

```json
{
  "street" : "dei pomi",
  "city" : "/cities/RE"
}
```

and we want to map those resources to the typescript model:

```typescript
interface City {
  name:string
}

interface Address {
  street:string
  city:City
}

interface Person {
  name:string
  friends:Person[]
  address:Address
}
```

We can achieve the result defining few classes:

```typescript
import { link, Lazy, convert, mapping } from "rest-fetch"

class CityImpl implements City {
  name: string
}

class AddressImpl implements Address {
  street: string

  @link( mapping(CityImpl) )
  city: City
}

class PersonImpl implements Person {
  name: string

  // must use Lazy, PersonImpl is not defined at this point
  @convert(Lazy.arrayOfLinks(() => PersonImpl))
  friends: Person[]

  @link( mapping(AddressImpl) )
  address: Address
}
```

And then:

```typescript
import { ResourceFetch, mapping } from "rest-fetch"

const rf = new ResourceFetch()
const result: Promise<Person> = rf.fetchResource("/persons/pippo", mapping(PersonImpl))

result.then(r => {
  expect(r.name).toBe("pippo")
  expect(r.friends.length).toBe(1)
  expect(r.friends[0].name).toBe("minni")
  // works with cyclic data strutures !
  expect(r.friends[0].friends[0]).toBe(r)
  done()
}, err => console.log(err))
```

See [tests](src/test) for more examples

It works for cyclic/recursive structures.

Issues/Limitations
==================

- classes instantiation is done invoking the constructor with no arguments
- @link() and @convert() annotations can be specified only for properties of classes
- class declaration order matters, actually you can only reference a previously defined class in link, or convert annotations