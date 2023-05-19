import { Entity, Index, Property } from '@mikro-orm/core'
import { AvatarState } from '../room/schema/AvatarState'
import { Position } from '../room/schema/Position'
import { Rotation } from '../room/schema/Rotation'
import { BaseEntity } from './BaseEntity'

@Entity({ collection: 'Account' })
export class AccountPO extends BaseEntity {
  @Index()
  @Property()
  phone: string

  @Index()
  @Property()
  encryptPhone: string

  @Property() displayPhone: string
  @Property() encryptPwd: string
  @Property() pendingSessionId: string = ''
  @Property() pendingSessionTimestamp: number = 0
  @Property({ nullable: true }) activeSessionId: string = ''
}

@Entity({ collection: 'UserProfile' })
export class ProfilePO extends BaseEntity {

  @Property() accountId: string
  @Property() username!: string
  @Property() progress: string = '0,0'
  @Property() prevGrid: string = '0,0'
  @Property() position: Position
  @Property() rotation: Rotation
  @Property({ nullable: true }) avatar?: AvatarState
  @Property() coins: number = 0

}