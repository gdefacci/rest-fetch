export interface City {
  name: string
}

export interface Address {
  street: string
  city: City
}

export interface Person {
  name: string
  friends: Person[]
  address: Address
}
