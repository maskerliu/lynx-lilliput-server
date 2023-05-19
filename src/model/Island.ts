import { IslandPO } from "../entity/Island"

export namespace Island {

  export type Island = Pick<IslandPO, 'id' | 'owner' | 'map'>

  export class MapItem {
    x: number = 0
    y: number = 0
    z: number = 0
    prefab: string = ''
    rotation: number = 0
  }
}