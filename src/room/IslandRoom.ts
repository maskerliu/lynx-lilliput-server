import { DataChange } from '@colyseus/schema'
import { Client, Room } from 'colyseus'
import { DI } from '../config/db.config'
import { V2, V3, Vector } from '../misc/Vectors'
import { Game } from '../model'
import { getStateForType } from './InteractableObjectFactory'
import { IslandState, PlayerState, PropState } from './schema/IslandState'
import { MsgTopic } from './schema/MsgTopics'
import { ProfileState } from './schema/UserState'
import { cli } from 'winston/lib/winston/config'


export class IslandRoom extends Room<IslandState> {

  islandId: string
  defObjReset = 5000

  onCreate(options: any): void | Promise<any> {
    console.log(options)

    if (options['islandId'] != null) {
      this.islandId = options['islandId']
    }

    this.maxClients = 200

    this.setState(new IslandState())

    this.state.id = this.islandId

    this.register4Message()

    this.setPatchRate(50)
    this.setSimulationInterval(dt => {
      this.state.serverTime += dt
      this.checkObjectReset()
    })
  }

  // async onAuth(client: Client<any>, options: any, request?: IncomingMessage) {
  // let account = await DI.accountRepo.findOne({ pendingSessionId: client.sessionId })
  // if (account) {
  //   account.activeSessionId = client.sessionId
  //   account.pendingSessionId = ''

  //   await DI.em.flush()

  //   return account
  // } else {
  //   throw new ServerError(400, "Bad session!")
  // }
  // }

  async onJoin(client: Client<any>, options?: any, auth?: any) {
    let user = await DI.userRepo.findOne({ id: options['uid'] })
    let player = new PlayerState().assign({
      clientId: client.id,
      timestamp: this.state.serverTime,
    })

    player.assign({ px: options['px'], py: options['py'], pz: options['pz'], })

    player.assign({ dx: 0, dy: 0, dz: 0, })

    player.profile = new ProfileState().assign({
      uid: user.id,
      prefab: user.prefab,
      skin: user.skin,
      username: user.username
    })

    this.state.players.set(player.profile.uid, player)
  }

  async onLeave(client: Client<any>, consented?: boolean) {
    // let account = await DI.accountRepo.findOne({ activeSessionId: client.sessionId })
    // let user = await DI.userRepo.findOne({ accountId: account.id })
    // if (account) {
    //   account.activeSessionId = ''
    // }

    // if (user) {
    //   user.position = this.state.getUserPosition(client.sessionId)
    //   user.rotation = this.state.getUserRotation(client.sessionId)
    // }

    // await DI.em.flush()

    try {
      if (consented) {
        throw new Error('consented leave!')
      }

      let newClient = await this.allowReconnection(client, 3)
      console.log(`reconnected! client: ${newClient.id}`)
    } catch (err) {
      console.log(`*** Removing Networked User and Entity ${client.id} ***`)

      let uid: string = null
      for (let item of this.state.players.values()) {
        if (item.clientId == client.id) uid = item.profile.uid
      }
      if (uid) { this.state.players.delete(uid) }
    }
  }

  onDispose(): void | Promise<any> {
    console.log(`room ${this.roomId} disposing...`)
  }

  private test(changes: DataChange<any, string>[]) {
    console.log(changes)
  }

  private register4Message() {
    this.onMessage(MsgTopic.PlayerUpdate, (client, data: Array<Game.PlayerMsg>) => {
      data.forEach(it => {
        if (!this.state.players.has(it.uid)) return
        this.onPlayerUpdate(it)
      })
    })

    this.onMessage(MsgTopic.PropInteracted, (client, data) => {
      this.handlePropInteract(client, data)
    })

    this.onMessage(MsgTopic.Transition, (client, data: Vector[]) => {
      if (data == null || data.length < 2) { return }

      this.onIslandUpdate(client, data[0] as V2, data[1] as V3)
    })
  }

  private onPlayerUpdate(msg: Game.PlayerMsg) {
    let player = this.state.players.get(msg.uid)

    if (msg.pos) {
      player.px = msg.pos.x
      player.py = msg.pos.y
      player.pz = msg.pos.z
    }

    if (msg.dir) {
      player.dx = msg.dir.x
      player.dy = msg.dir.y
      player.dz = msg.dir.z
    }

    player.state = msg.state

    player.timestamp = parseFloat(this.state.serverTime.toString())
  }

  private async handlePropInteract(client: Client, data: Array<any>) {
    if (!this.state.props.has(data[0])) {
      let interactable = getStateForType(data[1])
      interactable.assign({ id: data[0], inUse: false })
      this.state.props.set(data[0], interactable)
    }

    let interactable = this.state.props.get(data[0])
    if (interactable.inUse) {

    } else {
      let interactableState = this.state.players.get(client.id)
      if (interactableState != null && interactable != null) {
        if (this.handleObjectCost(interactable, interactableState)) {
          interactable.inUse = true
          interactable.availableTimestamp = this.state.serverTime + interactable.useDuration

          this.broadcast(MsgTopic.PropUsed, { interactedObjectId: interactable.id, interactStateId: interactableState.clientId })

          // let account = await DI.accountRepo.findOne({ activeSessionId: client.sessionId })
          // let user = await DI.userRepo.findOne({ accountId: account.id })
          // if (user) {
          //   // 
          //   await DI.em.flush()
          // }
        }
      }
    }
  }

  private async onIslandUpdate(client: Client, grid: V2, position: V3) {
    if (!this.state.players.has(client.sessionId)) {
      console.error(`*** On Grid Update -  User not in room - can't update their grid! - ${client.sessionId} ***`)
      return
    }

    if (grid.x == 0 && grid.y == 0) {
      console.error(`*** On Grid Update -  No grid change detected! ***`)
      return
    }

    // let account = await DI.accountRepo.findOne({ activeSessionId: client.sessionId })
    // if (account == null) {
    //   console.error(`*** On Grid Update - Error finding player! - ${client.sessionId} ***`)
    //   return
    // }
    // let user = await DI.userRepo.findOne({ accountId: account.id })
    // // let progress = user ? user.progress : '0,0'


    // let reservation = await matchMaker.joinOrCreate('island', str)
    // if (reservation == null) {
    //   console.error(`*** On Grid Update - Error getting seat reservation at grid \"${str}\" ***`)
    //   return
    // }

    // account.pendingSessionId = reservation.sessionId

    // user.progress = str
    // user.prevGrid = progress
    // user.position = new Position().assign(position)
    // user.rotation = this.state.getUserRotation(client.sessionId)
    // user.updatedAt = Date.now()

    // await DI.em.flush()

    // client.send(MsgTopic.EnterIsland, {
    //   newGridPos: newGrid,
    //   prevGridPos: new V2(curX, curY),
    //   reservation
    // })
  }

  private handleObjectCost(object: PropState, user: PlayerState): boolean {
    let cost = object.coinChange
    let worked = false

    // if (cost >= 0) {
    //   user.coins += cost
    //   worked = true
    // }

    // if (cost < 0) {
    //   if (Math.abs(cost) <= user.coins) {
    //     user.coins += cost
    //     worked = true
    //   } else {
    //     worked = false
    //   }
    // }

    return worked
  }

  private checkObjectReset() {
    this.state.props.forEach(it => {
      if (it.inUse && it.availableTimestamp <= this.state.serverTime) {
        it.inUse = false
        it.availableTimestamp = 0
      }
    })
  }
}