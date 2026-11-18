import type { Config } from "@netlify/functions"
import { getStore } from "@netlify/blobs"
import { getProduct, stockOf, dropiKey } from "../lib/dropi.mts"
import { CATALOGO } from "../lib/catalogo.mts"

// Cada 15 minutos copia el inventario de Dropi de todos los productos de la página.
export default async () => {
  if (!dropiKey()) { console.log("Sin llave de Dropi: no se sincroniza"); return }
  const store = getStore("inventario")
  const previo: any = (await store.get("actual", { type: "json" })) || { productos: {} }
  const productos: Record<string, any> = { ...previo.productos }
  const ids = Object.keys(CATALOGO)
  let ok = 0, fallos = 0
  const inicio = Date.now()
  for (let i = 0; i < ids.length && Date.now() - inicio < 24000; i += 10) {
    await Promise.all(ids.slice(i, i + 10).map(async id => {
      try { productos[id] = stockOf(await getProduct(Number(id))); ok++ }
      catch (e) { fallos++; console.log(`Producto ${id}: ${(e as Error).message}`) }
    }))
  }
  await store.setJSON("actual", { fecha: new Date().toISOString(), ok, fallos, productos })
  console.log(`Inventario: ${ok} leídos, ${fallos} con error`)
}

export const config: Config = { schedule: "*/15 * * * *" }
