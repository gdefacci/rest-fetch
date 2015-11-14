import * as test1 from "./test1"
import * as test2 from "./test2"
import * as EntriesMapTest from "./EntriesMapTest"
import {ErrorTest1} from "./error1"
import {assert, checkFail} from "./TestUtil"
import * as JsTypeTest from "./JsTypeTest"

export function allTests():Promise<any> {
  return Promise.all<any>([
    JsTypeTest.test1(),
    test1.test1(),
    test2.Test1.test1(),
    test2.Test2.test1(),
    test2.Test3.test1(),
    test2.Test4.test1(),
    test2.Test5.test1(),
    test2.Test5.test2(),
    test2.Test6.test1(),
    test2.Test6.test2(),
    EntriesMapTest.test1(),
    ErrorTest1.allErrorTests()
  ])
}

allTests().then( u => document.body.appendChild( document.createTextNode("done") ))