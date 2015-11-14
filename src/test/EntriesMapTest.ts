import {fail, Option} from "flib"
import {EntriesMap} from "../lib/EntriesMap"
import {ConstructorType, MetaLinksMap, ObjectMapping} from "../lib/Meta"
import {assert} from "./TestUtil"

class Cl1 {
}

class Cl2 extends Cl1{}

class Cl3 extends Cl2{}

class Cl4 extends Cl2{}

export module M1 {

    export class Cl1 {
    }

    export class Cl2 extends Cl1{}


}

export module M2 {

    export class Cl1 {
    }

    export class Cl2 extends Cl1{}

}

export function test1() {
  const om1:ObjectMapping = {}
  const om2:ObjectMapping = {}
  const om3:ObjectMapping = {}
  const om4:ObjectMapping = {}

  const m1_om1:ObjectMapping = {}
  const m1_om2:ObjectMapping = {}

  const m2_om1:ObjectMapping = {}
  const m2_om2:ObjectMapping = {}

  const linksMeta = new MetaLinksMap()

  linksMeta.store(Cl1, om1)

  assert(linksMeta.get(Cl1).getOrElse( () => fail<any>("Cl1") ) === om1)
  assert(linksMeta.get(Cl2).isEmpty())
  assert(linksMeta.get(Cl3).isEmpty())
  assert(linksMeta.get(M1.Cl1).isEmpty())

  linksMeta.store(Cl2, om2)

  assert(linksMeta.get(Cl1).getOrElse( () => fail<any>("Cl1") ) === om1)
  assert(linksMeta.get(Cl2).getOrElse( () => fail<any>("Cl2") ) === om2)
  assert(linksMeta.get(Cl3).isEmpty())
  assert(linksMeta.get(M1.Cl1).isEmpty())
  assert(linksMeta.get(M1.Cl2).isEmpty())

  linksMeta.store(Cl3, om3)

  assert(linksMeta.get(Cl1).getOrElse( () => fail<any>("Cl1") ) === om1)
  assert(linksMeta.get(Cl2).getOrElse( () => fail<any>("Cl2") ) === om2)
  assert(linksMeta.get(Cl3).getOrElse( () => fail<any>("Cl3") ) === om3)
  assert(linksMeta.get(Cl4).isEmpty())
  assert(linksMeta.get(M1.Cl1).isEmpty())
  assert(linksMeta.get(M1.Cl1).isEmpty())
  assert(linksMeta.get(M1.Cl2).isEmpty())

  linksMeta.store(Cl4, om4)

  assert(linksMeta.get(Cl1).getOrElse( () => fail<any>("Cl1") ) === om1)
  assert(linksMeta.get(Cl2).getOrElse( () => fail<any>("Cl2") ) === om2)
  assert(linksMeta.get(Cl3).getOrElse( () => fail<any>("Cl3") ) === om3)
  assert(linksMeta.get(Cl4).getOrElse( () => fail<any>("Cl4") ) === om4)

  linksMeta.store(M1.Cl1, m1_om1)

  assert(linksMeta.get(Cl1).getOrElse( () => fail<any>("Cl1") ) === om1)
  assert(linksMeta.get(Cl2).getOrElse( () => fail<any>("Cl2") ) === om2)
  assert(linksMeta.get(Cl3).getOrElse( () => fail<any>("Cl3") ) === om3)
  assert(linksMeta.get(Cl4).getOrElse( () => fail<any>("Cl4") ) === om4)
  assert(linksMeta.get(M1.Cl1).getOrElse( () => fail<any>("M1.Cl1") ) === m1_om1)
  assert(linksMeta.get(M1.Cl2).isEmpty())

  linksMeta.store(M1.Cl2, m1_om2)

  assert(linksMeta.get(Cl1).getOrElse( () => fail<any>("Cl1") ) === om1)
  assert(linksMeta.get(Cl2).getOrElse( () => fail<any>("Cl2") ) === om2)
  assert(linksMeta.get(Cl3).getOrElse( () => fail<any>("Cl3") ) === om3)
  assert(linksMeta.get(Cl4).getOrElse( () => fail<any>("Cl4") ) === om4)
  assert(linksMeta.get(M1.Cl1).getOrElse( () => fail<any>("M1.Cl1") ) === m1_om1)
  assert(linksMeta.get(M1.Cl2).getOrElse( () => fail<any>("M1.Cl2") ) === m1_om2)

  linksMeta.store(M2.Cl1, m2_om1)

  assert(linksMeta.get(Cl1).getOrElse( () => fail<any>("Cl1") ) === om1)
  assert(linksMeta.get(Cl2).getOrElse( () => fail<any>("Cl2") ) === om2)
  assert(linksMeta.get(Cl3).getOrElse( () => fail<any>("Cl3") ) === om3)
  assert(linksMeta.get(Cl4).getOrElse( () => fail<any>("Cl4") ) === om4)
  assert(linksMeta.get(M1.Cl1).getOrElse( () => fail<any>("M1.Cl1") ) === m1_om1)
  assert(linksMeta.get(M1.Cl2).getOrElse( () => fail<any>("M1.Cl2") ) === m1_om2)

  assert(linksMeta.get(M2.Cl1).getOrElse( () => fail<any>("M1.Cl1") ) === m2_om1)
  assert(linksMeta.get(M2.Cl2).isEmpty())

  linksMeta.store(M2.Cl2, m2_om2)

  assert(linksMeta.get(Cl1).getOrElse( () => fail<any>("Cl1") ) === om1)
  assert(linksMeta.get(Cl2).getOrElse( () => fail<any>("Cl2") ) === om2)
  assert(linksMeta.get(Cl3).getOrElse( () => fail<any>("Cl3") ) === om3)
  assert(linksMeta.get(Cl4).getOrElse( () => fail<any>("Cl4") ) === om4)
  assert(linksMeta.get(M1.Cl1).getOrElse( () => fail<any>("M1.Cl1") ) === m1_om1)
  assert(linksMeta.get(M1.Cl2).getOrElse( () => fail<any>("M1.Cl2") ) === m1_om2)

  assert(linksMeta.get(M2.Cl1).getOrElse( () => fail<any>("M1.Cl1") ) === m2_om1)
  assert(linksMeta.get(M2.Cl2).getOrElse( () => fail<any>("M1.Cl1") ) === m2_om2)

}