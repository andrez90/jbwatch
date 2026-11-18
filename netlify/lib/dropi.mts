// Conexión con la API de integraciones de Dropi (Colombia).
// Rutas y formato tomados del plugin oficial de Dropi para WooCommerce:
//   POST products/index · GET products/v2/{id} · POST orders/myorders
// La llave va solo en el servidor, en la variable DROPI_INTEGRATION_KEY.

const BASE = "https://api.dropi.co/integrations/"

export class DropiError extends Error {
  status: number
  constructor(code: string, status = 502) { super(code); this.status = status }
}

export function dropiKey(): string | undefined {
  const k = Netlify.env.get("DROPI_INTEGRATION_KEY")
  return k && k.trim() ? k.trim() : undefined
}

export async function dropi(path: string, method: "GET" | "POST", body?: unknown, retries = 0): Promise<any> {
  const key = dropiKey()
  if (!key) throw new DropiError("SIN_LLAVE", 503)
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(new URL(path, BASE), {
        method,
        headers: { "Content-Type": "application/json;charset=UTF-8", Accept: "application/json", "dropi-integration-key": key },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
        redirect: "error",
      })
      if ((res.status === 429 || res.status >= 500) && i < retries) { await new Promise(r => setTimeout(r, 500 * 2 ** i)); continue }
      const text = await res.text()
      let json: any = null
      try { json = text ? JSON.parse(text) : null } catch { /* respuesta no JSON */ }
      if (!res.ok) throw new DropiError(`HTTP_${res.status}:${(json?.message || text || "").toString().slice(0, 200)}`, res.status)
      if (json && json.isSuccess === false) throw new DropiError(`RECHAZADO:${(json.message || "").toString().slice(0, 200)}`, 422)
      return json && "objects" in json ? json.objects : json
    } catch (e) {
      if (e instanceof DropiError) throw e
      if (i < retries) { await new Promise(r => setTimeout(r, 500 * 2 ** i)); continue }
      throw new DropiError("SIN_CONEXION", 502)
    }
  }
}

const n = (v: any) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? Math.floor(x) : 0 }

// Inventario de un producto: total y por variación (color).
export function stockOf(p: any): { stock: number; variations: Record<string, number> } {
  const variations: Record<string, number> = {}
  for (const v of p?.variations || []) {
    const w = Array.isArray(v.warehouse_product_variation) && v.warehouse_product_variation.length
      ? v.warehouse_product_variation.reduce((s: number, x: any) => s + n(x.stock), 0) : n(v.stock)
    variations[String(v.id)] = w
  }
  const vs = Object.values(variations)
  const base = Array.isArray(p?.warehouse_product) && p.warehouse_product.length
    ? p.warehouse_product.reduce((s: number, x: any) => s + n(x.stock), 0) : n(p?.stock)
  return { stock: vs.length ? vs.reduce((a, b) => a + b, 0) : base, variations }
}

export async function getProduct(id: number) {
  return dropi(`products/v2/${id}`, "GET", undefined, 2)
}
