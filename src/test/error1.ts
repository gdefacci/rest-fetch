import {Option} from "flib"
import {link, fetch, convert} from "../index"
import {assert, testOpts, checkFail} from "./TestUtil"

export  module ErrorTest1 {

  const data = {
    "/res/pippo":{
      "arr":"pippo"
    }
  }

  function test0a() {
    class TestW {
      @link({arrayOf:undefined})
      arr:string
    }

    fetch(TestW, testOpts(data)).from("/res/pippo").then(p => {

    })
  }

  function test0b() {
    class TestW {
      @link({optionOf:undefined})
      arr:string
    }

    fetch(TestW, testOpts(data)).from("/res/pippo").then(p => {

    })
  }

  function test0c() {
    class TestW {
      @link({optionOf:String})
      arr:Option<string>
    }

    fetch(TestW, testOpts(data)).from("/res/pippo").then(p => {

    })
  }

  function test1() {
    class Item {
    }

    class TestW {
      @link({arrayOf:Item})
      arr:string
    }

    fetch(TestW, testOpts(data)).from("/res/pippo").then(p => {

    })
  }

  function test2() {
    class Item {
    }

    class TestW {
      @link(Item)
      arr:Item[]
    }

    fetch(TestW, testOpts(data)).from("/res/pippo").then(p => {

    })
  }

  function test3() {
    class Item {
    }

    class TestW {
      @link({optionOf:Item})
      arr:Item
    }

    fetch(TestW, testOpts(data)).from("/res/pippo").then(p => {

    })
  }

  function test4() {
    class Item {
    }

    class TestW {
      @link(Item)
      arr:Option<Item>
    }

    fetch(TestW, testOpts(data)).from("/res/pippo").then(p => {

    })
  }

  export function allErrorTests() {
    checkFail( () => test0a())
    checkFail( () => test0b())
    checkFail( () => test0c())
    checkFail( () => test1())
    checkFail( () => test2())
    checkFail( () => test3())
    checkFail( () => test4())
  }

}