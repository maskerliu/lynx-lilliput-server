import { Entity, Index, Property, Unique } from '@mikro-orm/core'
import { BaseEntity } from './BaseEntity'

@Entity({ collection: 'Island' })
export class IslandPO extends BaseEntity {

  @Index()
  @Unique()
  @Property() owner: string
  @Property({ nullable: true }) map: Array<MapItem>

}

export interface MapItem {
  x: number
  y: number
  z: number
  prefab: string
  angle: number
}
