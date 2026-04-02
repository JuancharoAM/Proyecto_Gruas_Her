# Spec: Pruebas Unitarias — Facturación, Evaluaciones y StarRating

Suite de pruebas unitarias para los módulos de Fase 4 y Fase 5.

---

## Stack

- **Backend:** Jest + ts-jest (TypeScript nativo)
- **Frontend:** Jest + @testing-library/react vía `next/jest`

---

## Backend — `backend/`

### Instalación (devDependencies)
```
jest, ts-jest, @types/jest
```

### Configuración
`backend/jest.config.ts`:
```typescript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

`backend/package.json` — agregar script:
```json
"test": "jest"
```

### Estrategia de mocking
- Mockear `../config/database` → `getPool()` retorna mock pool con interfaz fluent (`.request().input().query()`)
- Mockear `../services/notificaciones.service` → `crearNotificacion` y `crearParaRol` como `jest.fn()`

### Archivos de prueba

#### `backend/src/__tests__/facturas.service.test.ts`

| Caso | Descripción |
|------|-------------|
| generarNumeroFactura — sin registros previos | Retorna `FAC-YYYY-0001` |
| generarNumeroFactura — con registros existentes | Retorna `FAC-YYYY-NNNN+1` |
| crearFactura — solicitud no encontrada | Lanza `'Solicitud no encontrada.'` |
| crearFactura — solicitud no Finalizada | Lanza `'Solo se pueden facturar solicitudes finalizadas.'` |
| crearFactura — ya tiene factura | Lanza `'Ya existe una factura para esta solicitud.'` |
| crearFactura — cálculo IVA 13% | `impuestoMonto = round(subtotal * 0.13 * 100) / 100` |
| crearFactura — cálculo total | `total = subtotal + impuestoMonto` |
| marcarPagada — factura no encontrada | Retorna `null` |
| marcarPagada — factura no Pendiente | Lanza `'Solo se pueden pagar facturas pendientes.'` |
| anularFactura — factura no encontrada | Retorna `null` |
| anularFactura — factura no Pendiente | Lanza `'Solo se pueden anular facturas pendientes.'` |

#### `backend/src/__tests__/evaluaciones.service.test.ts`

| Caso | Descripción |
|------|-------------|
| crearEvaluacion — solicitud no encontrada | Lanza `'Solicitud no encontrada.'` |
| crearEvaluacion — solicitud no Finalizada | Lanza `'Solo se pueden evaluar solicitudes finalizadas.'` |
| crearEvaluacion — sin chofer asignado | Lanza `'La solicitud no tiene un chofer asignado.'` |
| crearEvaluacion — ya existe evaluación | Lanza `'Ya existe una evaluación para esta solicitud.'` |
| crearEvaluacion — notifica al chofer | Llama `crearNotificacion` con `usuario_id = chofer_id` |
| crearEvaluacion — formato estrellas en mensaje | Mensaje contiene `★` repetido `calificacion` veces |

#### `backend/src/__tests__/facturas.controller.test.ts`

| Caso | Descripción |
|------|-------------|
| crear — sin solicitud_id | Responde 400 con mensaje de campos requeridos |
| crear — sin subtotal | Responde 400 con mensaje de campos requeridos |
| crear — subtotal = 0 | Responde 400 `'El subtotal debe ser un número mayor a 0.'` |
| crear — subtotal negativo | Responde 400 |
| pagar — factura no encontrada | Responde 404 |
| pagar — factura no Pendiente (error de service) | Responde 400 con mensaje del error |
| anular — factura no encontrada | Responde 404 |
| anular — factura no Pendiente (error de service) | Responde 400 con mensaje del error |

#### `backend/src/__tests__/evaluaciones.controller.test.ts`

| Caso | Descripción |
|------|-------------|
| crear — sin solicitud_id | Responde 400 |
| crear — sin calificacion | Responde 400 |
| crear — calificacion = 0 | Responde 400 `'La calificación debe ser un número entre 1 y 5.'` |
| crear — calificacion = 6 | Responde 400 |
| crear — calificacion válida (3) | Llama al service y responde 201 |

---

## Frontend — `frontend/`

### Instalación (devDependencies)
```
jest, jest-environment-jsdom, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event
```

### Configuración
`frontend/jest.config.ts`: usa `next/jest` transformer.
`frontend/jest.setup.ts`: importa `@testing-library/jest-dom`.

`frontend/package.json` — agregar script:
```json
"test": "jest"
```

### Archivos de prueba

#### `frontend/src/__tests__/StarRating.test.tsx`

| Caso | Descripción |
|------|-------------|
| Renderiza 5 estrellas | El componente siempre muestra exactamente 5 SVGs |
| Readonly — value=3 | Las primeras 3 estrellas tienen fill `#f5a623`, las 2 restantes tienen fill de border-color |
| Readonly — click no llama onChange | No dispara `onChange` al hacer click |
| Interactivo — click estrella 4 | Llama `onChange(4)` |
| Interactivo — click estrella 1 | Llama `onChange(1)` |
| Interactivo — hover estrella 5 | Cambia displayValue a 5 (todas rellenas) |
| Interactivo — mouseLeave | Vuelve al valor original después de salir del hover |
| Size por defecto | SVGs tienen `width=24` y `height=24` |
| Size personalizado | SVGs tienen el size especificado |

---

## Resumen de archivos

### Crear:
- `backend/jest.config.ts`
- `backend/src/__tests__/facturas.service.test.ts`
- `backend/src/__tests__/facturas.controller.test.ts`
- `backend/src/__tests__/evaluaciones.service.test.ts`
- `backend/src/__tests__/evaluaciones.controller.test.ts`
- `frontend/jest.config.ts`
- `frontend/jest.setup.ts`
- `frontend/src/__tests__/StarRating.test.tsx`

### Modificar:
- `backend/package.json` — agregar script `"test"` y devDependencies
- `frontend/package.json` — agregar script `"test"` y devDependencies
