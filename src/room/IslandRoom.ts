import { Client, Room, ServerError, matchMaker } from 'colyseus'
import { IncomingMessage } from 'http'
import { DI } from '../config/db.config'
import { MsgTopic } from '../entity/MsgTopics'
import { Vector, Vector2, Vector3 } from '../misc/Vectors'
import { getStateForType } from './InteractableObjectFactory'
import { AvatarState } from './schema/AvatarState'
import { Position } from './schema/Position'
import { InteractableState, NetworkedEntityState, RoomState } from './schema/RoomState'


export class IslandRoom extends Room<RoomState> {

  progress: string

  defObjReset = 5000

  onCreate(options: any): void | Promise<any> {
    this.setState(new RoomState())

    if (options['roomId'] != null) {
      this.roomId = options['roomId']
    }

    this.maxClients = 200
    this.progress = options['progress'] || '0,0'

    this.setState(new RoomState())

    this.register4Message()

    this.setPatchRate(50)
    this.setSimulationInterval(dt => {
      this.state.serverTime += dt
      this.checkObjectReset()
    })
  }

  async onAuth(client: Client<any>, options: any, request?: IncomingMessage) {
    let account = await DI.accountRepo.findOne({ pendingSessionId: client.sessionId })
    if (account) {
      account.activeSessionId = client.sessionId
      account.pendingSessionId = ''

      await DI.em.flush()

      return account
    } else {
      throw new ServerError(400, "Bad session!")
    }
  }

  async onJoin(client: Client<any>, options?: any, auth?: any) {
    let user = await DI.userRepo.findOne(auth.id)
    let networkedUser = new NetworkedEntityState().assign({
      id: client.id,
      timestamp: this.state.serverTime,
      username: user.username
    })

    if (user.position != null) {
      networkedUser.assign({
        xPos: user.position.x,
        yPos: user.position.y,
        zPos: user.position.z,
      })

    }

    if (user.rotation != null) {
      networkedUser.assign({
        xRot: user.rotation.x,
        yRot: user.rotation.y,
        zRot: user.rotation.z,
      })

    }

    if (user.avatar) {
      networkedUser.avatar = new AvatarState().assign({
        model: user.avatar.model,
        skin: user.avatar.skin
      })
    }
    networkedUser.coins = user.coins || 0
    this.state.networkedUsers.set(client.id, networkedUser)
  }

  async onLeave(client: Client<any>, consented?: boolean) {
    let account = await DI.accountRepo.findOne({ activeSessionId: client.sessionId })
    let user = await DI.userRepo.findOne({ accountId: account.id })
    if (account) {
      account.activeSessionId = ''
    }

    if (user) {
      user.position = this.state.getUserPosition(client.sessionId)
      user.rotation = this.state.getUserRotation(client.sessionId)
    }

    await DI.em.flush()

    try {
      if (consented) {
        throw new Error('consented leave!')
      }

      let newClient = await this.allowReconnection(client, 3)
      console.log(`reconnected! client: ${newClient.id}`)
    } catch (err) {
      console.log(`*** Removing Networked User and Entity ${client.id} ***`)
      let state2Leave = this.state.networkedUsers.get(client.id)
      if (state2Leave) { this.state.networkedUsers.delete(client.id) }
    }
  }

  onDispose(): void | Promise<any> {
    console.log(`room ${this.roomId} disposing...`)
  }

  private register4Message() {
    this.onMessage(MsgTopic.EntityUpdate, (client, data) => {
      if (!this.state.networkedUsers.has(`${data[0]}`)) return
      this.onEntityUpdate(client.id, data)
    })

    this.onMessage(MsgTopic.ObjectInteracted, (client, data) => {
      this.handleObjectInteract(client, data)
    })

    this.onMessage(MsgTopic.Transition, (client, data: Vector[]) => {
      if (data == null || data.length < 2) { return }

      this.onIslandUpdate(client, data[0] as Vector2, data[1] as Vector3)
    })
  }

  private onEntityUpdate(clientId: string, data: any) {
    let state2Update = this.state.networkedUsers.get(`${data[0]}`)
    let startIdx = 1

    for (let i = startIdx; i < data.length; ++i) {
      const property = data[i]
      let updateVal = data[i + 1]
      if (updateVal === 'inc') {
        updateVal = data[i + 2]
        i++
      }

      (state2Update as any)[property] = updateVal
    }

    state2Update.timestamp = parseFloat(this.state.serverTime.toString())
  }

  private async handleObjectInteract(client: Client, data: Array<any>) {
    if (!this.state.interactableItems.has(data[0])) {
      let interactable = getStateForType(data[1])
      interactable.assign({ id: data[0], inUse: false })
      this.state.interactableItems.set(data[0], interactable)
    }

    let interactable = this.state.interactableItems.get(data[0])
    if (interactable.inUse) {

    } else {
      let interactableState = this.state.networkedUsers.get(client.id)
      if (interactableState != null && interactable != null) {
        if (this.handleObjectCost(interactable, interactableState)) {
          interactable.inUse = true
          interactable.availableTimestamp = this.state.serverTime + interactable.useDuration

          this.broadcast(MsgTopic.ObjectUsed, { interactedObjectId: interactable.id, interactStateId: interactableState.id })

          let account = await DI.accountRepo.findOne({ activeSessionId: client.sessionId })
          let user = await DI.userRepo.findOne({ accountId: account.id })
          if (user) {
            user.coins = interactableState.coins
            await DI.em.flush()
          }
        }
      }
    }
  }

  private async onIslandUpdate(client: Client, grid: Vector2, position: Vector3) {
    if (!this.state.networkedUsers.has(client.sessionId)) {
      console.error(`*** On Grid Update -  User not in room - can't update their grid! - ${client.sessionId} ***`)
      return
    }

    if (grid.x == 0 && grid.y == 0) {
      console.error(`*** On Grid Update -  No grid change detected! ***`)
      return
    }

    let account = await DI.accountRepo.findOne({ activeSessionId: client.sessionId })
    if (account == null) {
      console.error(`*** On Grid Update - Error finding player! - ${client.sessionId} ***`)
      return
    }
    let user = await DI.userRepo.findOne({ accountId: account.id })
    let progress = user ? user.progress : '0,0'

    let curGrid: string[] = progress.split(',')
    let curX = Number(curGrid[0])
    let curY = Number(curGrid[1])
    let newGrid = new Vector2(curX + grid.x, curY + grid.y)

    if (isNaN(newGrid.x) || isNaN(newGrid.y)) {
      console.error(`*** On Grid Update - Error calculating new grid position! X = ${newGrid.x}  Y = ${newGrid.y} ***`)
      return
    }

    let str = `${newGrid.x},${newGrid.y}`

    let reservation = await matchMaker.joinOrCreate('island_room', str)
    if (reservation == null) {
      console.error(`*** On Grid Update - Error getting seat reservation at grid \"${str}\" ***`)
      return
    }

    account.pendingSessionId = reservation.sessionId

    user.progress = str
    user.prevGrid = progress
    user.position = new Position().assign(position)
    user.rotation = this.state.getUserRotation(client.sessionId)
    user.updatedAt = Date.now()

    await DI.em.flush()

    client.send(MsgTopic.EnterIsland, {
      newGridPos: newGrid,
      prevGridPos: new Vector2(curX, curY),
      reservation
    })
  }

  private handleObjectCost(object: InteractableState, user: NetworkedEntityState): boolean {
    let cost = object.coinChange
    let worked = false

    if (cost >= 0) {
      user.coins += cost
      worked = true
    }

    if (cost < 0) {
      if (Math.abs(cost) <= user.coins) {
        user.coins += cost
        worked = true
      } else {
        worked = false
      }
    }

    return worked
  }

  private checkObjectReset() {
    this.state.interactableItems.forEach(it => {
      if (it.inUse && it.availableTimestamp <= this.state.serverTime) {
        it.inUse = false
        it.availableTimestamp = 0
      }
    })
  }
}