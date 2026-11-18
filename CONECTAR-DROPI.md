# Conectar JB Watch con Dropi

## Cómo funciona
- El cliente elige reloj y color, llena sus datos y el pedido entra **automático** a tu cuenta de Dropi como contra entrega (`/api/pedido`).
- Antes de crear el pedido se revisa el inventario real en Dropi. Si ese color se agotó, no se crea.
- Cada 15 minutos se copia el inventario de Dropi; la página oculta colores y relojes agotados (`/api/inventario`).
- El precio sale del servidor (`netlify/lib/catalogo.mts`), no del navegador.
- Un mismo celular no puede pedir el mismo reloj dos veces el mismo día. Máximo 5 intentos por minuto por persona.

## Activarlo (una sola vez)
1. Dropi → **Integraciones** → crea una integración/tienda y copia el **token**.
2. Netlify → proyecto **jbwatch** → *Project configuration* → *Environment variables* → **Add a variable**:
   - Key: `DROPI_INTEGRATION_KEY`
   - Value: el token
   - Marca **Contains secret values** y alcance **Functions**.
3. Sube estos cambios (commit y push). Netlify publica solo.
4. Abre `https://jbwatch.netlify.app/api/estado`. Debe decir `"conectado": true`.

## Si un pedido no pudo entrar a Dropi
No se pierde: queda guardado en Netlify → *Data & Storage* → *Blobs* → tienda **pedidos** → carpeta `por-revisar/`. Ahí está el cliente, el reloj, el color y el motivo. Créalo a mano en Dropi y llama al cliente.

## Ajustes opcionales
- `DROPI_ESTADO_PEDIDO`: estado con el que se crea el pedido. Por defecto `PENDIENTE CONFIRMACION`, igual que el plugin oficial de Dropi.
- Cambiar precios: edita `netlify/lib/catalogo.mts` y el precio que se ve en `index.html`.
