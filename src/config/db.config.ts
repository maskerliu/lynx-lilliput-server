import { EntityManager, EntityRepository, MikroORM } from '@mikro-orm/core'
import { IslandPO } from '../entity/Island'
import { AccountPO, ProfilePO } from '../entity/User'


export const DI = {} as {
  orm: MikroORM
  em: EntityManager
  accountRepo: EntityRepository<AccountPO>
  userRepo: EntityRepository<ProfilePO>
  islandRepo: EntityRepository<IslandPO>
}

export async function connect() {
  DI.orm = await MikroORM.init({
    clientUrl: 'mongodb://localhost:27017/lilliput?retryWrites=true&w=majority',
    type: 'mongo',
    entities: [AccountPO, ProfilePO, IslandPO],
  })
  DI.em = DI.orm.em.fork()

  DI.accountRepo = DI.em.getRepository(AccountPO)
  DI.userRepo = DI.em.getRepository(ProfilePO)
  DI.islandRepo = DI.em.getRepository(IslandPO)
}