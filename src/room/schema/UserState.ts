import { Schema, type } from '@colyseus/schema'


export class ProfileState extends Schema {
  @type('string') uid: string
  @type('string') username: string
  @type('string') prefab: string
  @type('string') skin: string
}