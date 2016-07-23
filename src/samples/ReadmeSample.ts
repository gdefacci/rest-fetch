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

// ---------------------------------------------------------------------------

import {link,lazyMapping, Value, convert} from "../index"

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

// ---------------------------------------------------------------------------

import {fetchResource,  mapping} from "../index"

const result:Promise<Person> = fetchResource(mapping(PersonImpl)).from("/persons/pippo")
