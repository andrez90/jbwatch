import type { Config } from "@netlify/functions"
import { getStore } from "@netlify/blobs"

export default async () => {
  const snap = await getStore("inventario").get("actual", { type: "json" })
  return Response.json(snap?.productos || {}, { headers: { "Cache-Control": "public, max-age=120", "Netlify-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } })
}

export const config: Config = { path: "/api/inventario", method: "GET" }
