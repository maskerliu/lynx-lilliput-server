import { Client, Room } from 'colyseus'
import { ChatMessage, ChatQueue, ChatRoomState } from './schema/IslandState'


export class ChatRoom extends Room<ChatRoomState> {

  msgLifeTime: number = 5000
  serverTime: number = 0

  onCreate(options: any): void | Promise<any> {
    this.setState(new ChatRoomState())

    if (options['msgLifeTime']) {
      this.msgLifeTime = options['msgLifeTime']
    }

    this.registerForMessage()
    this.setPatchRate(1000 / 20)
    this.setSimulationInterval(dt => {
      this.serverTime += dt
      this.pruneMessages()

      if (this.state == null) {
        console.log('no state!')
      }
    })
  }

  onJoin(client: Client<any>, options?: any, auth?: any): void | Promise<any> {
    let queue = new ChatQueue()
    this.state.chatQueue.set(client.sessionId, queue)
  }

  onLeave(client: Client<any>, consented?: boolean): void | Promise<any> {
    this.state.chatQueue.delete(client.sessionId)
  }

  onDispose(): void | Promise<any> {
    console.log("room", this.roomId, "disposing...")
  }

  private registerForMessage() {
    this.onMessage('sendChat', (client: Client, message: any) => {
      this.handleMessage(client, message)
    })
  }

  private handleMessage(client: Client, message: any) {
    let msg = new ChatMessage().assign({
      senderID: client.sessionId,
      message: message.message,
      timestamp: this.serverTime + this.msgLifeTime
    })

    this.placeMessageInQueue(client, msg)
  }

  private placeMessageInQueue(client: Client, msg: ChatMessage) {
    let modifiedTimestamp = msg.timestamp
    let chatQueue: ChatQueue = this.state.chatQueue.get(client.id)
    chatQueue.chatMessages.forEach(it => {
      if (it.senderID == client.id) {
        let diff = modifiedTimestamp - it.timestamp
        if (diff < this.msgLifeTime) {
          modifiedTimestamp = it.timestamp + this.msgLifeTime
        }
      }
    })

    msg.timestamp = modifiedTimestamp
    chatQueue.chatMessages.push(msg)
  }

  private pruneMessages() {
    this.state.chatQueue.forEach(queue => {
      queue.chatMessages.forEach((msg, idx) => {
        if (this.serverTime >= msg.timestamp) {
          queue.chatMessages.slice(idx, 1)
        }
      })
    })
  }
}