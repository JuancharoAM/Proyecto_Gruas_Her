# Spec: Fase 6 — Mapa GPS

Sistema de rastreo de ubicación en tiempo real para grúas activas en Grúas Heredianas.

---

## Resumen

Los choferes reportan su posición GPS automáticamente cada 10 segundos desde "Mis Servicios". Administradores y personal de Logística visualizan un mapa con marcadores de todas las grúas con solicitudes activas, con popup de detalle por cada una.

---

## Base de datos

### Tabla `ubicaciones`

```sql
CREATE TABLE ubicaciones (
    id INT PRIMARY KEY IDENTITY(1,1),
    camion_id INT NOT NULL UNIQUE REFERENCES camiones(id),
    chofer_id INT NOT NULL REFERENCES usuarios(id),
    latitud DECIMAL(10,7) NOT NULL,
    longitud DECIMAL(10,7) NOT NULL,
    fecha_reporte DATETIME DEFAULT GETDATE()
);
```

- Una fila por camión (`UNIQUE` en `camion_id`).
- Las actualizaciones usan `MERGE` (UPSERT): si ya existe la fila para ese `camion_id`, actualiza `latitud`, `longitud`, `chofer_id` y `fecha_reporte`; si no, inserta.
- La ubicación persiste hasta que el chofer reporte una nueva (no se elimina al finalizar la solicitud).

---

## Backend

### `src/services/ubicaciones.service.ts`

**`reportarUbicacion({ camion_id, chofer_id, latitud, longitud })`**
- Ejecuta `MERGE` sobre la tabla `ubicaciones`.
- No lanza errores de negocio; falla silenciosamente si el camión no existe (FK violation → 500).

**`listarActivas()`**
- JOIN entre `ubicaciones`, `camiones` y `solicitudes` (estado IN `'Asignada'`, `'En camino'`, `'Atendiendo'`) y `usuarios` (chofer).
- También trae `cliente_nombre` desde la solicitud.
- Devuelve array con: `camion_id`, `placa`, `chofer_nombre`, `numero_servicio`, `cliente_nombre`, `latitud`, `longitud`, `fecha_reporte`.
- Solo se devuelven camiones cuya solicitud activa más reciente está en uno de los estados listados.

### `src/controllers/ubicaciones.controller.ts`

| Método | Acción |
|--------|--------|
| `reportar(req, res)` | Llama `reportarUbicacion`, responde `200 { success: true }`. Sin notificaciones. |
| `activas(req, res)` | Llama `listarActivas`, responde `200 { success: true, data: [...] }`. |

### `src/routes/ubicaciones.routes.ts`

| Ruta | Middleware | Rol |
|------|-----------|-----|
| `POST /` | `authMiddleware` + `roleCheck` | `Chofer` |
| `GET /activas` | `authMiddleware` + `roleCheck` | `Administrador`, `Logística` |

### Registro en `app.ts`

```typescript
import ubicacionesRoutes from './routes/ubicaciones.routes';
app.use('/api/ubicaciones', ubicacionesRoutes);
```

---

## Frontend

### Dependencias nuevas (`frontend/package.json`)

```json
"leaflet": "^1.9.4",
"react-leaflet": "^4.2.1",
"@types/leaflet": "^1.9.14"
```

Se instalan dentro del contenedor Docker en el build. No se instalan localmente.

### `src/types/index.ts`

```typescript
export interface UbicacionActiva {
    camion_id: number;
    placa: string;
    chofer_nombre: string;
    numero_servicio: string;
    cliente_nombre: string;
    latitud: number;
    longitud: number;
    fecha_reporte: string;
}
```

### `src/lib/api.ts`

```typescript
export async function listarUbicacionesActivas(): Promise<UbicacionActiva[]>
export async function reportarUbicacion(data: { camion_id: number; latitud: number; longitud: number }): Promise<void>
```

### `src/components/Icon.tsx`

Agregar path para ícono `map` (SVG de pin de mapa).

### `src/app/dashboard/layout.tsx`

Nueva entrada en `menuItems`:

```typescript
{ href: '/dashboard/mapa', label: 'Mapa GPS', icon: 'map', roles: ['Administrador', 'Logística'] }
```

### `src/components/MapaGPS.tsx`

Componente client-only (no puede importarse con SSR activo):

- Usa `MapContainer`, `TileLayer` (OpenStreetMap: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`), `Marker`, `Popup` de `react-leaflet`.
- Props: `ubicaciones: UbicacionActiva[]`.
- Centro inicial: Costa Rica — `lat: 9.9281`, `lng: -84.0907`, zoom `10`.
- Cada marcador muestra popup con:
  - Placa del camión
  - Nombre del chofer
  - Número de servicio
  - Nombre del cliente

### `src/app/dashboard/mapa/page.tsx`

- Carga `MapaGPS` con `dynamic(() => import('../../../components/MapaGPS'), { ssr: false })`.
- Al montar: llama `listarUbicacionesActivas()` e inicia `setInterval` de 30s para refrescar.
- Limpia el intervalo en el cleanup del `useEffect`.
- Muestra estado vacío si no hay grúas activas ("No hay grúas activas en este momento").

### `src/app/dashboard/mis-servicios/page.tsx`

Agregar `useEffect` de reporte de ubicación:

- Activo solo cuando la solicitud del chofer tiene estado `En camino` o `Atendiendo`.
- Cada 10s: llama `navigator.geolocation.getCurrentPosition`.
  - Si el navegador no soporta geolocalización: no hace nada (sin alertas).
  - Si el usuario deniega el permiso: falla silenciosamente.
  - Si obtiene posición: llama `reportarUbicacion({ camion_id, latitud, longitud })`.
- El `camion_id` se obtiene de la solicitud activa del chofer (ya cargada en la página).
- El intervalo se limpia en el cleanup del `useEffect` o cuando el estado de la solicitud cambia.

---

## Restricciones

- El mapa **solo muestra grúas con solicitudes activas** (Asignada, En camino, Atendiendo).
- Un chofer sin solicitud activa puede reportar posición pero no aparecerá en el mapa.
- La ubicación no se elimina al finalizar una solicitud; desaparece del mapa porque el JOIN la excluye.
- No hay historial de recorridos en esta fase.
- El reporte de ubicación falla silenciosamente en el cliente (no interrumpe la UI del chofer).
