import { Entity, Index, Property } from '@mikro-orm/core'
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
  @Property() prefab: string = 'human'
  @Property() skin: string = 'criminalMaleA'
  @Property() coins: number = 0

}