import { link, Lazy, convert, mapping } from "../../index"
import {City, Address, Person} from"./model"

export class CityImpl implements City {
  name: string
}

export class AddressImpl implements Address {
  street: string

  @link( mapping(CityImpl) )
  city: City
}

export class PersonImpl implements Person {
  name: string

  // must use Lazy, PersonImpl is not defined at this point
  @convert(Lazy.arrayOfLinks(() => PersonImpl))
  friends: Person[]

  @link( mapping(AddressImpl) )
  address: Address
}
