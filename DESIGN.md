# JB Watch — notas de diseño

**Referencia:** pin de Pinterest (tienda de relojes oscura con brillo azul). Se tomó la idea, no se copió: fondo azul noche, reloj grande con resplandor, títulos en mayúscula fina, tarjetas oscuras por colección.

**Objetivo único:** que el visitante pida un reloj contra entrega.

## Tokens
- Fondo `#070b14`, panel `#0d1422`, línea `#1e2a42`, texto `#e9eef7`, texto suave `#9aa8c0`, acento `#4aa8ff` / `#7fd4ff`.
- Tipografía del sistema (0 descargas). Títulos peso 300 en mayúscula; cuerpo 16 px.
- Radios 18 px (tarjetas) y píldora (botones). Botones de 48 px de alto mínimo.

## Movimiento (nivel 1, venta directa)
Solo CSS y un `IntersectionObserver`: reloj que flota, brillo en botones, tarjetas que suben 4 px, aparición al hacer scroll. 0 librerías. Respeta `prefers-reduced-motion`. El título y el botón no esperan ninguna animación.

## Pendientes del dueño
Dominio, datos legales, garantía, tiempos y costo de envío, logo, llave de Dropi y direcciones de `CONFIG` en `index.html`.

## Fotos
Se cargan desde el servidor de imágenes de Dropi. Al publicar conviene copiarlas en WebP de 480 px para que la página pese menos.
