import { monitor } from '@colyseus/monitor'
import { Server } from 'colyseus'
import cors, { CorsOptions } from 'cors'
import express, { Application } from 'express'
import { createServer } from 'http'
import { Autowired, Component } from 'lynx-express-mvc'
import { connect as dbConnect } from './config/db.config'
import { BaseEntity } from './entity/BaseEntity'
import { ChatRoom } from './room/ChatRoom'
import { IslandRoom } from './room/IslandRoom'
import BizRouter from './router'
const port = parseInt(process.env.PORT, 10) || 3000

const CorsOpt: CorsOptions = {
  credentials: true,
  optionsSuccessStatus: 200,
  origin: [
    'https://maskerliu.github.io',
    `http://localhost:7456`,
    `http://localhost:7457`,
    'http://192.168.37.61:7456',
    'http://192.168.37.61:7457'
  ]
}

@Component()
class BizServer {

  private gameApp: Server
  private expressApp: Application

  @Autowired()
  private bizRouter: BizRouter

  init() {
    this.expressApp = express()
    this.expressApp.use(cors(CorsOpt))
    this.expressApp.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
    this.expressApp.use(express.json({ type: ['application/json'], limit: '50mb' }))
    this.expressApp.use('/colyseus', monitor())

    this.expressApp.all('*', (req, resp) => {
      this.bizRouter.route(req, resp)
    })
    // this.expressApp.use((req, res, next) => RequestContext.create(DI.orm.em, next))

    this.gameApp = new Server({ server: createServer(this.expressApp) })
    this.gameApp.define('chatRoom', ChatRoom).filterBy(['roomId'])
    this.gameApp.define('islandRoom', IslandRoom).filterBy(['progress'])
  }

  async start() {
    this.init()
    await dbConnect()
    console.log(`*** Connected to Database! ***`)
    this.gameApp.listen(port)
    console.log(`[GameServer] Listening on Port: ${port}`)
  }

  instance() { }
}

const localServer = new BizServer()
localServer.instance()
localServer.start()


interface Test {
  name: string
  gender: string
  test: Array<string>
}

console.log()


class BaseVO {
  id: string = ''


}

class TestVO extends BaseVO {
  name: string
}

class TestPO extends BaseEntity {
  name: string = ''
  test: string = ''

  constructor(name: string, test: string) {
    super()
    this.name = name
    this.test = test
  }
}

export function po2vo<T extends BaseVO, D extends BaseEntity>(vo: T, po: D) {
  let properties = Object.getOwnPropertyNames(vo)
  console.log(properties)
  properties.forEach(it => {
    vo[it] = po[it]
  })


}

let testVO = new TestVO()
let testPO = new TestPO('chris', 'hello')

po2vo(testVO, testPO)

console.log(testVO)

class Test {
  name: string = ''
  tt: string = ''
}
console.log(Object.getPrototypeOf(Test))