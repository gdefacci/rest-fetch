import {MappingType} from "../lib/types"
import {assert} from "./TestUtil"

export function test1() {

  class MyRes {

  }

  assert(MappingType.isArrayJsType({ arrayOf:MyRes }))
  assert(!MappingType.isArrayJsType({ arrayOf:String }), "{ arrayOf:String } is not as MappingType")


}