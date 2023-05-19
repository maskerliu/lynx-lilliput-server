import { Request, Response } from 'express'
import { Route, Router } from 'lynx-express-mvc'

import './controller/IslandController'
import './controller/UserController'

@Router()
export default class BizRouter {

  @Route()
  route(...args: any): boolean { return true }

  error(req: Request, resp: Response, err: any) {

  }

  instance() { }
}