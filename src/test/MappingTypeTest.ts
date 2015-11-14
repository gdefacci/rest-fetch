import {MappingType} from "../lib/types"
import {assert} from "./TestUtil"

export function test1() {

  class MyRes {

  }

  assert(MappingType.isArrayMappingType({ arrayOf:MyRes }))
  assert(!MappingType.isArrayMappingType({ arrayOf:String }), "{ arrayOf:String } is not as MappingType")


}