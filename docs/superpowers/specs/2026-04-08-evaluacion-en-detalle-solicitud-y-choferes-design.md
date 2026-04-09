# Diseño: Evaluación visible en detalle de solicitud y servicios por chofer

**Fecha:** 2026-04-08  
**Alcance:** Solo lectura — no se agrega creación de evaluaciones desde estas vistas.

---

## Objetivo

Mostrar la evaluación post-servicio (calificación en estrellas + comentario) en dos lugares donde actualmente no aparece:

1. Modal de detalle de una solicitud finalizada (`solicitudes/page.tsx`)
2. Tarjetas de servicios finalizados en el tab "Servicios" de la página de choferes (`choferes/page.tsx`)

---

## Contexto del sistema

- El backend ya expone `GET /api/evaluaciones/solicitud/:id` — devuelve `Evaluacion | null`.
- La función `obtenerEvaluacionPorSolicitud(id)` ya existe en `frontend/src/lib/api.ts`.
- El componente `StarRating` ya existe en `frontend/src/components/StarRating.tsx`.
- La interfaz `Evaluacion` ya está en `frontend/src/types/index.ts`.

No se requieren cambios en backend ni en types.

---

## Estrategia de carga: Fetch lazy por solicitud (Opción A)

Cada vista hace su propia llamada a la API solo cuando necesita mostrar la evaluación (solicitud finalizada visible). Sin cambios al contrato de la API de solicitudes.

---

## Cambio 1 — Modal de detalle en `solicitudes/page.tsx`

**Trigger:** `modalDetalle` se abre con una `solicitudSel` cuyo `estado === 'Finalizada'`.

**Estado local a agregar:**
```ts
const [evaluacionDetalle, setEvaluacionDetalle] = useState<Evaluacion | null>(null);
const [loadingEvaluacion, setLoadingEvaluacion] = useState(false);
```

**useEffect:**  
Se dispara cuando `modalDetalle` es `true` y `solicitudSel?.estado === 'Finalizada'`. Llama `obtenerEvaluacionPorSolicitud(solicitudSel.id)` y guarda el resultado. Al cerrar el modal, limpia `evaluacionDetalle`.

**Bloque visual al final del modal (antes del `modal-footer`):**  
Solo se renderiza si `solicitudSel.estado === 'Finalizada'`.

- Si `loadingEvaluacion`: texto pequeño "Cargando evaluación…"
- Si `evaluacionDetalle` existe: sección con título "Evaluación del servicio", `StarRating` readonly, comentario (si existe), nombre del cliente que evaluó y fecha.
- Si `evaluacionDetalle` es `null` (tras cargar): texto "Sin evaluación registrada" en color muted.

---

## Cambio 2 — Tab "Servicios" en `choferes/page.tsx`

**Componente interno:** `EvaluacionInline`

```tsx
function EvaluacionInline({ solicitudId }: { solicitudId: number }) { ... }
```

- Al montarse: llama `obtenerEvaluacionPorSolicitud(solicitudId)`.
- Sin spinner visible (la ausencia de datos es el estado de carga).
- Si no hay evaluación: texto "Sin evaluación" en color muted.
- Si existe: `StarRating` readonly (size 16) + comentario truncado a 60 caracteres.

**Uso:** Se inserta en las tarjetas/filas de servicios con `estado === 'Finalizada'` dentro del panel de servicios por chofer. No se renderiza para otros estados.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `frontend/src/app/dashboard/solicitudes/page.tsx` | Estado + useEffect + bloque visual en modal detalle |
| `frontend/src/app/dashboard/choferes/page.tsx` | Componente `EvaluacionInline` + uso en servicios finalizados |

**Sin cambios en:** backend, `types/index.ts`, `api.ts`, `StarRating.tsx`.

---

## Casos borde

- Solicitud finalizada sin evaluación: se muestra "Sin evaluación registrada / Sin evaluación".
- Error de red al cargar la evaluación: se trata como `null` (sin evaluación), sin mostrar error al usuario.
- Evaluación sin comentario: se muestra solo las estrellas.
