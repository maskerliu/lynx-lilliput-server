import { InteractableState } from "./schema/IslandState";


export function getStateForType(type: string): InteractableState {
  let state = new InteractableState()
  switch (type) {
    case 'default':
      state.assign({
        coinChange: 0,
        useDuration: 5100
      })
      break
    case 'button_podium':
      state.assign({
        coinChange: 1,
        useDuration: 10000
      })
      break
    case 'coin_op':
      state.assign({
        coinChange: -1,
        useDuration: 5100
      })
      break
    case 'teleporter':
      state.assign({
        coinChange: -2,
        useDuration: 5100
      })
      break
  }
  state.interactableType = type
  return state
}