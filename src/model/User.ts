import { AccountPO, ProfilePO } from "../entity/User"

export namespace User {

  export type Account = Pick<AccountPO, 'id' | 'displayPhone'>

  export type Profile = Pick<ProfilePO, 'id' | 'username' | 'avatar'>
}