import { MapSchema, Schema, type } from '@colyseus/schema'
import { V3 } from '../../misc/Vectors'
import { ProfileState } from './UserState'

export class PlayerState extends Schema {
  @type('string') clientId: string = 'ID'

  //Position
  @type('number') px: number = 0.0
  @type('number') py: number = 0.0
  @type('number') pz: number = 0.0
  //Rotation
  @type('number') dx: number = 0.0
  @type('number') dy: number = 0.0
  @type('number') dz: number = 0.0

  @type('number') state: number = 0

  @type('number') timestamp: number = 0.0

  @type(ProfileState) profile: ProfileState = new ProfileState()
}

export class PropState extends Schema {
  @type('string') id: string = 'ID'
  @type('boolean') inUse: boolean = false
  @type('string') interactableType: string = ''
  @type('number') availableTimestamp: number = 0.0
  @type('number') coinChange: number = 0.0
  @type('number') useDuration: number = 0.0
}

export class IslandState extends Schema {
  @type('string') id: string = ''
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>()
  @type({ map: PropState }) props = new MapSchema<PropState>()
  @type('number') serverTime: number = 0.0
}