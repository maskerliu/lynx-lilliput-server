import { BodyParam, Controller, Get, Post, QueryParam } from 'lynx-express-mvc'
import { DI } from '../config/db.config'
import { Island } from '../model/Island'
import { RemoteApi } from '../model/RemoteApi'


@Controller(RemoteApi.Island.BasePath)
export class IslandController {

  @Get(RemoteApi.Island.Info)
  async getIsland(@QueryParam('owner') owner: string, @QueryParam('islandId') islandId?: string) {
    console.log(owner, islandId)
    if (owner == null && islandId == null) {
      throw '参数错误!'
    } else {
      let sql = {}
      if (owner) { sql = Object.assign({ owner }) }
      if (islandId) { sql = Object.assign({ id: islandId }) }
      let island = await DI.islandRepo.findOne(sql)
      if (island) {
        let result = { ...island }
        delete result._id
        result.id = island.id
        return result
      } else {
        throw '用户的小岛还未创建！'
      }
    }
  }

  @Post(RemoteApi.Island.Update)
  async updateIsland(@BodyParam() data: Island.Island) {
    if (data.owner == null) {
      throw '参数错误'
    } else {

      let po = await DI.islandRepo.findOne({ owner: data.owner })

      if (po == null) {
        po = DI.islandRepo.create({ owner: data.owner })
        await DI.em.flush()
      }
      po = await DI.islandRepo.upsert({ id: po.id, owner: data.owner, map: data.map })

      let result: Island.Island = {
        id: po.id,
        owner: po.owner,
        map: po.map
      }
      return result
    }
  }
}