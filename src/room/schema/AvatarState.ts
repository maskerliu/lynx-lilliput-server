import { Schema, type } from '@colyseus/schema'


export class AvatarState extends Schema {
  @type('string') model: string = 'human'
  @type('string') skin: string = 'default'
}