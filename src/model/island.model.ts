import { IslandPO } from "../entity/Island"

export namespace Island {

  export type Island = Pick<IslandPO, 'id' | 'owner' | 'map'>

  export interface MapItem {
    x: number
    y: number
    z: number
    prefab: string
    angle: number
    skin?: MapItemSkin
  }

  export enum MapItemSkin {
    Grass,
    Snow,
    Dirt
  }
}