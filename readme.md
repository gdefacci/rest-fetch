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

```
interface City {
  name: string
}

interface Address {
  street: string
  city: City
}

interface Person {
  name: string
  friends: Person[]
  address: Address
}
```

We can achieve the result defining few mapping classes:

```
import {link,lazyMapping, Value, convert} from "rest-fetch"

class CityImpl implements City {
  name: string
}

class AddressImpl implements Address {
  street: string

  @link()
  city: City
}

class PersonImpl implements Person {
  name: string

  @convert(Value.array(Value.link(lazyMapping(() => PersonImpl))))
  friends: Person[]

  @link()
  address: Address
}
```

And then:

```
import {fetchResource,  mapping} from "rest-fetch"

const result:Promise<Person> = fetchResource(mapping(PersonImpl)).from("/persons/pippo")
```

See [tests](src/test) for more examples

It also works for cyclic/recursive structures.

Build
=====
```
npm run-script clean
```
remove artifacts produced by the build
```
npm install & npm test
```
launch the tests
```
npm runScript mkTest
```
create jasmine test browser bundle, that can be run on the browser

Issues/Limitations
==================

- classes instantiation is done invoking the constructor with no arguments
- @link() and @convert() annotations can be specified only for properties of classes