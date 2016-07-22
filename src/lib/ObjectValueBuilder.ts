import {JsMap} from "flib"

import {JsConstructor, Value, ExtraPropertiesStrategy, ObjectValue} from "./model"

export default class ObjectValueBuilder<T> {
  private result:ObjectValue<T>
  constructor(public jsConstructor:JsConstructor<T>, private properties:JsMap<[string, () => Value<any>]>, public extraPropertiesStrategy:ExtraPropertiesStrategy) {
  }
  setExtraPropertiesStrategy(eps:ExtraPropertiesStrategy) {
    this.extraPropertiesStrategy = eps;
  }
  add(targetProperty:string, sourceProperty:string, mapping:() => Value<any>){
    if (this.result) throw new Error("cannot add more properties")
    this.properties[targetProperty] = [sourceProperty, mapping];
  }
  build():ObjectValue<T> {
    if (!this.result)
      this.result = Value.object<T>(this.jsConstructor, this.properties, this.extraPropertiesStrategy)()
    return this.result;
  }
}