

export function po2vo(vo: any, po: any) {
  let properties = Object.getOwnPropertyNames(vo)
  properties.forEach(it => {
    vo[it] = po[it]
  })
}