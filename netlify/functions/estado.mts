import type { Config } from "@netlify/functions"
import { getStore } from "@netlify/blobs"
import { getProduct, dropiKey } from "../lib/dropi.mts"
import { CATALOGO } from "../lib/catalogo.mts"

// Revisa la conexión con Dropi sin crear pedidos ni mostrar la llave. Abre /api/estado.
function datosDeLaLlave(k: string) {
  const info: any = { largo: k.length, pareceJWT: k.split(".").length === 3, tieneEspacios: /\s/.test(k), tieneComillas: /["']/.test(k) }
  if (info.pareceJWT) {
    try {
      const p = JSON.parse(Buffer.from(k.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"))
      info.tipo = p.token_type ?? null
      info.emitida = p.iat ? new Date(p.iat * 1000).toISOString() : null
      info.vence = p.exp ? new Date(p.exp * 1000).toISOString() : null
      info.idsDeIntegracion = Object.fromEntries(Object.entries(p).filter(([c]) => /integration|ip_url|wb_id/.test(c)))
    } catch { info.jwtIlegible = true }
  }
  return info
}

async function probar(path: string, method: "GET" | "POST", body?: unknown) {
  const key = dropiKey()!
  try {
    const r = await fetch(new URL(path, "https://api.dropi.co/integrations/"), {
      method, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json;charset=UTF-8", Accept: "application/json", "dropi-integration-key": key },
    })
    const t = await r.text()
    let j: any = null; try { j = JSON.parse(t) } catch {}
    return { http: r.status, ok: j?.isSuccess ?? r.ok, mensaje: (j?.message ?? t).toString().slice(0, 160) }
  } catch (e) { return { error: (e as Error).message } }
}

export default async () => {
  const h = { "Cache-Control": "no-store" }
  const snap: any = await getStore("inventario").get("actual", { type: "json" })
  const inv = snap ? { ultimaSincronizacion: snap.fecha, leidos: snap.ok, conError: snap.fallos } : "todavía no ha corrido"
  const key = dropiKey()
  if (!key) return Response.json({ conectado: false, motivo: "Falta la variable DROPI_INTEGRATION_KEY en Netlify", inventario: inv }, { headers: h })
  const id = Number(Object.keys(CATALOGO)[0])
  try {
    const p = await getProduct(id)
    return Response.json({ conectado: true, productoDePrueba: p?.name ?? null, inventario: inv }, { headers: h })
  } catch (e) {
    return Response.json({
      conectado: false, motivo: (e as Error).message, inventario: inv,
      diagnostico: {
        llave: datosDeLaLlave(key),
        producto: await probar(`products/v2/${id}`, "GET"),
        catalogo: await probar("products/index", "POST", { startData: 0, pageSize: 1, order_type: "desc", order_by: "id", keywords: "", active: true, no_count: true, integration: true, get_stock: false }),
      },
    }, { headers: h })
  }
}

export const config: Config = { path: "/api/estado", method: "GET", rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] } }
