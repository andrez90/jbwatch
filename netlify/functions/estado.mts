import type { Config } from "@netlify/functions"
import { getStore } from "@netlify/blobs"
import { getProduct, dropiKey } from "../lib/dropi.mts"
import { CATALOGO } from "../lib/catalogo.mts"

// Revisa la conexión con Dropi sin crear pedidos. Abre /api/estado en el navegador.
export default async () => {
  const snap: any = await getStore("inventario").get("actual", { type: "json" })
  const inv = snap ? { ultimaSincronizacion: snap.fecha, leidos: snap.ok, conError: snap.fallos } : "todavía no ha corrido"
  if (!dropiKey()) return Response.json({ conectado: false, motivo: "Falta la variable DROPI_INTEGRATION_KEY en Netlify", inventario: inv })
  try {
    const p = await getProduct(Number(Object.keys(CATALOGO)[0]))
    return Response.json({ conectado: true, productoDePrueba: p?.name ?? null, inventario: inv }, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    return Response.json({ conectado: false, motivo: (e as Error).message, inventario: inv }, { headers: { "Cache-Control": "no-store" } })
  }
}

export const config: Config = { path: "/api/estado", method: "GET", rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] } }
