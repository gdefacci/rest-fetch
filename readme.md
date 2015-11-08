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
GET /cities/RE =>
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

We can achieve the result defining few classes:

    import {link, fetch} from "rest-fetch"

    class CityImpl implements City {
      name:string
    }

    class AddressImpl implements Address {
      street:string
      
      @link()
      city:City
    }

    class PersonImpl implements Person {
      name:string
      
      @link({ arrayOf:Person })
      friends:Person[]
      
      @link()
      address:Address
    }

And then:

```
const result:Promise<Person> = fetch(PersonImpl).from("/persons/pippo")  
```

See [tests](src/test) for more examples

It also works for cyclic/recursive structures.

Issues/Limitations
==================

- classes instantiation is done invoking the constructor with no arguments 
- @link() and @convert() annotations can be specified only for properties of classes 
- overriding @link() or @convert() annotations in subclasses is actually broken
- class declaration order matters, actually you can only reference a previously defined class in link, or convert annotations