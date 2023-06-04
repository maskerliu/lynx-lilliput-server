import { BodyParam, Controller, Get, Post, QueryParam } from 'lynx-express-mvc'
import { DI } from '../config/db.config'
import { IslandPO } from '../entity/Island'
import { Island } from '../model/island.model'
import { RemoteApi } from '../model/api'


@Controller(RemoteApi.Island.BasePath)
export class IslandController {

  @Get(RemoteApi.Island.Info)
  async getIsland(@QueryParam('owner') owner: string, @QueryParam('islandId') islandId?: string) {
    if (owner == null && islandId == null) {
      throw '参数错误!'
    } else {
      let sql = {}
      if (owner) { sql = Object.assign({ owner }) }
      if (islandId) { sql = Object.assign({ id: islandId }) }
      let data = await DI.islandRepo.findOne(sql)
      if (data) {
        let result: Island.Island = {
          id: data.id,
          owner: data.owner,
          map: data.map
        }
        return result
      } else {
        data = new IslandPO()
        data.owner = owner
        data.map = [
          { x: -1, y: 0, z: -1, prefab: 'block', angle: 0, skin: 0 },
          { x: -1, y: 0, z: 0, prefab: 'block', angle: 0, skin: 0 },
          { x: -1, y: 0, z: 1, prefab: 'block', angle: 0, skin: 0 },
          { x: 0, y: 0, z: -1, prefab: 'block', angle: 0, skin: 0 },
          { x: 0, y: 0, z: 0, prefab: 'block', angle: 0, skin: 0 },
          { x: 0, y: 0, z: 1, prefab: 'block', angle: 0, skin: 0 },
          { x: 1, y: 0, z: -1, prefab: 'block', angle: 0, skin: 0 },
          { x: 1, y: 0, z: 0, prefab: 'block', angle: 0, skin: 0 },
          { x: 1, y: 0, z: -1, prefab: 'block', angle: 0, skin: 0 },
          { x: 0, y: 1, z: 0, prefab: 'tree', angle: 0, skin: 0 }
        ]
        DI.islandRepo.create(data)
        await DI.em.flush()
        data = await DI.islandRepo.findOne(sql)
        let result: Island.Island = {
          id: data.id,
          owner: data.owner,
          map: data.map
        }
        return result
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