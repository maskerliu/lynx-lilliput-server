import { matchMaker } from 'colyseus'
import { BodyParam, Controller, Get, Post, QueryParam } from 'lynx-express-mvc'
import md5 from 'md5'
import { DI } from '../config/db.config'
import { AccountPO, ProfilePO } from '../entity/User'
import { RemoteApi } from '../model/RemoteApi'
import { Position } from '../room/schema/Position'
import { Rotation } from '../room/schema/Rotation'
import { po2vo } from '../main'
import { User } from '../model/User'


@Controller(RemoteApi.User.BasePath)
export class UserController {

  @Get(RemoteApi.User.ValidCheck)
  async validCheck(@QueryParam('phone') phone: string, @QueryParam('username') username: string) {

    if (phone != null) {
      let account = await DI.accountRepo.findOne({ encryptPhone: phone })
      if (account) {
        throw '手机号已注册，请换一个或直接登录！'
      } else {
        return ''
      }
    }

    if (username != null) {
      let user = await DI.userRepo.findOne({ username: username })
      if (user) {
        throw '用户名已被占用，请换一个！'
      } else {
        return ''
      }
    }

    throw '参数错误'
  }

  @Post(RemoteApi.User.SignUp)
  async signUp(@BodyParam() data: { phone: string, username: string, pwd: string }) {

    if (data.username == null || data.phone == null || data.pwd == null) {
      throw 'New user must have a username, email, and password!'
    }

    let account: AccountPO
    let user: ProfilePO

    account = await DI.accountRepo.findOne({ phone: data.phone })
    user = await DI.userRepo.findOne({ username: data.username })
    let seatReservation: matchMaker.SeatReservation

    if (account == null && user == null) {
      account = DI.accountRepo.create({
        phone: data.phone,
        encryptPhone: md5(data.phone),
        displayPhone: `${data.phone.substring(0, 3)}****${data.phone.substring(7)}`,
        encryptPwd: data.pwd
      })
      await DI.em.flush()

      account = await DI.accountRepo.findOne({ phone: data.phone })
      console.log(account.id)
      user = DI.userRepo.create({ username: data.username, accountId: account.id })

      seatReservation = await matchMaker.joinOrCreate('islandRoom', user.progress)
      this.updateUserForNewSession(account, seatReservation.sessionId)

      user.position = new Position().assign({ x: 0, y: 1, z: 0 })
      user.rotation = new Rotation().assign({ x: 0, y: 0, z: 0 })

      await DI.em.flush()
    } else {
      throw 'User with that name already exists!'
    }

    const userData = { ...user, ...account }
    delete userData._id
    delete userData.phone
    delete userData.encryptPhone
    delete userData.encryptPwd
    delete userData.createdAt
    delete userData.updatedAt
    userData.id = user.id

    return { seatReservation, user: userData }
  }

  @Post(RemoteApi.User.Login)
  async login(@BodyParam() data: { phone: string, username: string, pwd: string }) {
    if ((data.username == null && data.phone == null) || data.pwd == null) {
      throw 'Missing username or password'
    }

    let account: AccountPO = null
    let user: ProfilePO = null
    let validPassword = false

    if (data.phone) {
      account = await DI.accountRepo.findOne({ encryptPhone: data.phone })
      validPassword = account != null ? account.encryptPwd == data.pwd : false
      if (validPassword) {
        user = await DI.userRepo.findOne({ accountId: account.id })
      }
    }

    if (data.username) {
      user = await DI.userRepo.findOne({ username: data.username })

      if (user) {
        account = await DI.accountRepo.findOne({ id: user.accountId })
        validPassword = account != null ? account.encryptPwd == data.pwd : false
      } else {
        throw '用户不存在，请先注册！'
      }
    }

    if (account == null || !validPassword) {
      throw '用户名密码错误'
    }

    if (account.activeSessionId) {
      throw '用户已登录'
    }

    if (account.pendingSessionId && account.pendingSessionTimestamp && (Date.now() - account.pendingSessionTimestamp) <= 30000) {
      let timeLeft = (Date.now() - account.pendingSessionTimestamp) / 1000
      throw `失效期未过, 请${timeLeft}后再重试!`
    }

    let reservation = await matchMaker.joinOrCreate('islandRoom', user.progress)
    this.updateUserForNewSession(account, reservation.sessionId)

    await DI.em.flush()


    // po2vo<>()

    let accountVO: User.Account = {
      id: account.id,
      displayPhone: account.displayPhone
    }

    let profileVO: User.Profile = {
      id: user.id,
      username: user.username
    }

    return Object.assign(accountVO, profileVO)
  }

  @Get(RemoteApi.User.Profile)
  async profile(@QueryParam('uid') uid: string) {

    let user = await DI.userRepo.findOne({ id: uid })
    if (user) {
      let result = { ...user }
      result.id = user.id
      delete result.createdAt
      delete result.updatedAt

      return result
    } else {
      throw '未找到该用户'
    }
  }

  private updateUserForNewSession(account: AccountPO, sessionId: string) {
    account.pendingSessionId = sessionId
    account.pendingSessionTimestamp = Date.now()
    account.updatedAt = Date.now()
  }
}

