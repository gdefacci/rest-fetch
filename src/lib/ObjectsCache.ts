import {TypeExpr} from "./TypeExpr"
import {EntriesMap, Entry as EEntry} from "./EntriesMap"

export class ObjectsCache extends EntriesMap<TypeExpr, Promise<any>> {
  constructor() {
    super((a,b) => a.equalTo(b))
  }
}