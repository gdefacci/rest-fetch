import {JsType} from "../lib/types"
import {assert} from "./TestUtil"

export function test1() {

  class MyRes {

  }

  assert(JsType.isArrayJsType({ arrayOf:MyRes }))
  assert(!JsType.isArrayJsType({ arrayOf:String }), "{ arrayOf:String } is not as JsType")


}