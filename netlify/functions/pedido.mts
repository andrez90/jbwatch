import type { Config, Context } from "@netlify/functions"
import { getStore } from "@netlify/blobs"
import { dropi, getProduct, stockOf, DropiError, dropiKey } from "../lib/dropi.mts"
import { CATALOGO } from "../lib/catalogo.mts"
import CIUDADES from "../../ciudades.json"

const txt = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max)
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } })

export default async (req: Request, context: Context) => {
  let b: any
  try { b = await req.json() } catch { return json({ message: "Datos inválidos." }, 400) }
  if (b.website) return json({ ok: true, message: "Recibido." })

  const id = Number(b.product_id), item = CATALOGO[String(id)]
  if (!item) return json({ message: "Ese producto ya no está disponible. Elige otro." }, 400)
  const variation_id = b.variation_id ? Number(b.variation_id) : null
  if (item.v.length && (!variation_id || !item.v.includes(variation_id))) return json({ message: "Elige el color del reloj." }, 400)

  const name = txt(b.name, 40), surname = txt(b.surname, 40), dir = txt(b.dir, 150), state = txt(b.state, 6), city = txt(b.city, 60)
  const phone = String(b.phone ?? "").replace(/\D/g, "")
  if (name.length < 2 || surname.length < 2) return json({ message: "Escribe tu nombre y apellido." }, 400)
  if (!/^3\d{9}$/.test(phone)) return json({ message: "Escribe un celular de 10 dígitos que empiece por 3." }, 400)
  if (dir.length < 6) return json({ message: "Escribe la dirección completa con barrio." }, 400)
  const ciudades = (CIUDADES as any).c[state] as string[] | undefined
  if (!ciudades || !ciudades.includes(city)) return json({ message: "Elige tu departamento y tu ciudad de la lista." }, 400)

  const pedidos = getStore({ name: "pedidos", consistency: "strong" })
  const hoy = new Date().toISOString().slice(0, 10)
  const llaveDup = `dup/${hoy}/${phone}-${id}`
  if (await pedidos.get(llaveDup)) return json({ message: "Ya recibimos este pedido hoy desde tu celular. Si necesitas otro, escríbenos." }, 409)

  const numero = `JB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
  const registro: any = { numero, fecha: new Date().toISOString(), producto: { id, nombre: item.n, precio: item.p, variation_id }, cliente: { name, surname, phone, state, city, dir }, ip: context.ip }

  const guardarParaRevisar = async (motivo: string) => {
    registro.estado = "POR_REVISAR"; registro.motivo = motivo
    await pedidos.setJSON(`por-revisar/${numero}`, registro)
    await pedidos.set(llaveDup, numero)
    return json({ ok: true, numero, message: `Recibimos tu pedido ${numero}. Te escribimos al ${phone} para confirmarlo. Pagas al recibir.` }, 202)
  }

  if (!dropiKey()) return guardarParaRevisar("Falta la llave de Dropi en Netlify")

  let producto: any
  try { producto = await getProduct(id) } catch (e) { return guardarParaRevisar(`No se pudo leer el producto: ${(e as Error).message}`) }
  const st = stockOf(producto)
  const disponible = variation_id ? (st.variations[String(variation_id)] ?? 0) : st.stock
  if (disponible < 1) return json({ message: "Ese reloj (o ese color) se acaba de agotar. Elige otro color u otro modelo." }, 409)

  const { gallery, description, ...resto } = producto || {}
  const payload = {
    total_order: item.p,
    notes: `Web JB Watch ${numero}`,
    name, surname, dir, country: "CO", state, city, phone,
    payment_method_id: 1,
    status: Netlify.env.get("DROPI_ESTADO_PEDIDO") || "PENDIENTE CONFIRMACION",
    type: "FINAL_ORDER",
    rate_type: "CON RECAUDO",
    products: [{ ...resto, id, name: producto?.name || item.n, quantity: 1, price: item.p, ...(variation_id ? { variation_id } : {}), token: dropiKey() }],
    calculate_costs_and_shiping: true,
    supplier_id: producto?.user_id,
    shop_order_id: numero,
    create_product_if_not_exist: false,
  }

  try {
    // Nunca se reintenta: un error de red puede esconder una orden que sí se creó.
    const r = await dropi("orders/myorders", "POST", payload, 0)
    const dropiId = r?.id ?? r?.order?.id ?? null
    registro.estado = "EN_DROPI"; registro.dropiId = dropiId
    await pedidos.setJSON(`ok/${numero}`, registro)
    await pedidos.set(llaveDup, numero)
    return json({ ok: true, numero, dropiId, message: `¡Listo! Tu pedido ${numero} quedó registrado. Te llega a la dirección que nos diste y pagas al recibir.` })
  } catch (e) {
    const err = e as DropiError
    if (err.status === 422 || err.status === 400) {
      registro.estado = "RECHAZADO"; registro.motivo = err.message
      await pedidos.setJSON(`rechazados/${numero}`, registro)
      return json({ message: "No pudimos registrar el pedido con esa dirección. Revisa ciudad y dirección e intenta de nuevo." }, 422)
    }
    return guardarParaRevisar(`Dropi no confirmó: ${err.message}`)
  }
}

export const config: Config = {
  path: "/api/pedido",
  method: "POST",
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip", "domain"] },
}
