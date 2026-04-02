# Spec: Fase 4 (Facturacion) + Fase 5 (Evaluaciones)

Sistema de facturacion sencilla y evaluaciones post-servicio para Gruas Heredianas.

---

## Fase 4: Facturacion

### Tabla `facturas`

```sql
CREATE TABLE facturas (
    id INT PRIMARY KEY IDENTITY(1,1),
    numero_factura VARCHAR(20) NOT NULL UNIQUE,
    solicitud_id INT NOT NULL REFERENCES solicitudes(id),
    cliente_nombre VARCHAR(100) NOT NULL,
    cliente_telefono VARCHAR(20),
    cliente_email VARCHAR(100),
    subtotal DECIMAL(12,2) NOT NULL,
    impuesto_pct DECIMAL(5,2) DEFAULT 13.00,
    impuesto_monto DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'Pendiente',
    descripcion TEXT,
    fecha_emision DATETIME DEFAULT GETDATE(),
    fecha_pago DATETIME NULL,
    creado_por INT NOT NULL REFERENCES usuarios(id),
    notas TEXT NULL
);
```

- `numero_factura`: auto-generado con formato `FAC-YYYY-NNNN` (secuencial por ano)
- `estado`: Pendiente | Pagada | Anulada
- `impuesto_pct`: IVA Costa Rica 13% por defecto
- Datos del cliente se copian desde la solicitud al momento de crear la factura

### Backend

**Service (`facturas.service.ts`):**
- `listarFacturas()` — todas las facturas con JOIN a solicitudes
- `obtenerPorId(id)` — factura individual con detalle de solicitud
- `crearFactura(dto)` — genera numero_factura, calcula impuestos, copia datos cliente desde solicitud
- `marcarPagada(id)` — cambia estado a Pagada, registra fecha_pago
- `anularFactura(id)` — cambia estado a Anulada (solo si esta Pendiente)
- `obtenerResumen()` — totales por estado, conteos

**Controller (`facturas.controller.ts`):**
- GET `/` — listar con filtro opcional `?estado=X`
- GET `/resumen` — resumen de totales
- GET `/:id` — obtener por ID
- POST `/` — crear factura (body: `solicitud_id`, `subtotal`, `descripcion`, `notas`)
- PUT `/:id/pagar` — marcar como pagada
- PUT `/:id/anular` — anular factura

**Routes (`facturas.routes.ts`):**
- Todas las rutas requieren `authMiddleware` + `roleCheck(['Administrador'])`

**Registro en `app.ts`:**
- `app.use('/api/facturas', facturasRoutes)`

### Frontend

**Tipos (`types/index.ts`):**
```typescript
interface Factura {
  id: number;
  numero_factura: string;
  solicitud_id: number;
  numero_servicio?: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  cliente_email?: string;
  subtotal: number;
  impuesto_pct: number;
  impuesto_monto: number;
  total: number;
  estado: string;
  descripcion?: string;
  fecha_emision: string;
  fecha_pago?: string;
  creado_por: number;
  notas?: string;
}

interface ResumenFacturas {
  total_pendiente: number;
  total_pagado: number;
  cantidad_pendientes: number;
  cantidad_pagadas: number;
  cantidad_anuladas: number;
}
```

**API (`lib/api.ts`):**
- `listarFacturas(estado?)`, `obtenerFactura(id)`, `crearFactura(data)`, `marcarFacturaPagada(id)`, `anularFactura(id)`, `obtenerResumenFacturas()`

**Pagina `/dashboard/facturacion/page.tsx`:**
- Resumen superior: cards con total pendiente (colones), total pagado, cantidad por estado
- Filtro por estado: Todas | Pendiente | Pagada | Anulada
- Tabla: numero_factura, fecha, cliente, descripcion, total, estado (badge), acciones
- Boton "Nueva Factura" abre modal:
  - Selector de solicitudes finalizadas sin factura
  - Al seleccionar solicitud, auto-carga datos del cliente
  - Campo subtotal (monto del servicio)
  - Campo descripcion
  - Campo notas (opcional)
  - Muestra calculo automatico: subtotal, IVA 13%, total
- Acciones por fila: Marcar pagada (si Pendiente), Anular (si Pendiente), Exportar PDF

**PDF individual:**
- Patron existente: `window.open()` + HTML con estilos para impresion
- Encabezado: "Gruas Heredianas Gimome S.A.", cedula juridica generica, direccion generica, telefono generico
- Datos factura: numero, fecha emision, estado
- Datos cliente: nombre, telefono, email
- Detalle: descripcion del servicio, numero de solicitud
- Montos: subtotal, IVA 13%, total (en colones costarricenses)
- Pie: notas, fecha de pago (si aplica)

**Sidebar:**
- Label: "Facturacion"
- Icono: `invoice` (nuevo en Icon.tsx — documento con lineas)
- Roles: `['Administrador']`
- Posicion: despues de Mantenimiento, antes de Reportes

### Notificaciones

- Al crear factura: notificar a todos los usuarios con rol Administrador

---

## Fase 5: Evaluaciones

### Tabla `evaluaciones`

```sql
CREATE TABLE evaluaciones (
    id INT PRIMARY KEY IDENTITY(1,1),
    solicitud_id INT NOT NULL UNIQUE REFERENCES solicitudes(id),
    chofer_id INT NOT NULL REFERENCES usuarios(id),
    calificacion INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario TEXT NULL,
    evaluado_por INT NOT NULL REFERENCES usuarios(id),
    fecha_creacion DATETIME DEFAULT GETDATE()
);
```

- `solicitud_id` UNIQUE: solo una evaluacion por solicitud
- `calificacion`: 1-5 estrellas
- `evaluado_por`: el cliente que evalua
- `chofer_id`: se obtiene automaticamente de la solicitud

### Backend

**Service (`evaluaciones.service.ts`):**
- `crearEvaluacion(dto)` — valida que solicitud este finalizada y no tenga evaluacion previa, obtiene chofer_id de la solicitud
- `obtenerPorSolicitud(solicitudId)` — evaluacion de una solicitud especifica
- `listarEvaluaciones(choferId?)` — todas las evaluaciones, filtro opcional por chofer
- `promediosPorChofer()` — promedio de calificacion y cantidad de evaluaciones por chofer

**Controller (`evaluaciones.controller.ts`):**
- POST `/` — crear evaluacion (body: `solicitud_id`, `calificacion`, `comentario`)
- GET `/solicitud/:solicitudId` — obtener evaluacion de una solicitud
- GET `/` — listar con filtro opcional `?chofer_id=X`
- GET `/promedios` — promedios por chofer

**Routes (`evaluaciones.routes.ts`):**
- POST `/` — `roleCheck(['Cliente'])`
- GET `/solicitud/:solicitudId` — autenticado (cualquier rol)
- GET `/` y GET `/promedios` — `roleCheck(['Administrador', 'Logística'])`

**Registro en `app.ts`:**
- `app.use('/api/evaluaciones', evaluacionesRoutes)`

### Frontend

**Componente `StarRating.tsx`:**
- Props: `value: number`, `onChange?: (val: number) => void`, `readonly?: boolean`, `size?: number`
- Modo interactivo: hover resalta estrellas, click selecciona
- Modo readonly: muestra calificacion sin interaccion
- Estrellas con CSS puro, color dorado `#f5a623`, gris para vacias
- SVG de estrella inline (sin dependencias)

**Tipos (`types/index.ts`):**
```typescript
interface Evaluacion {
  id: number;
  solicitud_id: number;
  numero_servicio?: string;
  chofer_id: number;
  chofer_nombre?: string;
  calificacion: number;
  comentario?: string;
  evaluado_por: number;
  cliente_nombre?: string;
  fecha_creacion: string;
}

interface PromedioChofer {
  chofer_id: number;
  chofer_nombre: string;
  promedio: number;
  total_evaluaciones: number;
}
```

**API (`lib/api.ts`):**
- `crearEvaluacion(data)`, `obtenerEvaluacionPorSolicitud(solicitudId)`, `listarEvaluaciones(choferId?)`, `obtenerPromediosChoferes()`

**Integracion en "Mis Solicitudes" (`/dashboard/mis-solicitudes/page.tsx`):**
- Solicitudes finalizadas sin evaluacion muestran boton "Evaluar"
- Click abre modal con `StarRating` interactivo + campo comentario opcional
- Despues de evaluar, el boton cambia a mostrar la calificacion dada (StarRating readonly)

**Pagina `/dashboard/evaluaciones/page.tsx` (Admin/Logistica):**
- Seccion superior: resumen de promedios por chofer (nombre, estrellas, cantidad de evaluaciones)
- Tabla inferior: todas las evaluaciones con fecha, solicitud, chofer, cliente, calificacion (StarRating readonly), comentario
- Filtro por chofer

**Sidebar:**
- Label: "Evaluaciones"
- Icono: `star` (nuevo en Icon.tsx — estrella de 5 puntas)
- Roles: `['Administrador', 'Logística']`
- Posicion: despues de Facturacion

### Notificaciones

- Al recibir evaluacion: notificar al chofer evaluado con la calificacion recibida

---

## Iconos nuevos en `Icon.tsx`

- `invoice`: documento con lineas horizontales (SVG path)
- `star`: estrella de 5 puntas (SVG path)

---

## Resumen de archivos a crear/modificar

### Crear:
- `database/init.sql` — agregar tablas `facturas` y `evaluaciones`
- `backend/src/services/facturas.service.ts`
- `backend/src/controllers/facturas.controller.ts`
- `backend/src/routes/facturas.routes.ts`
- `backend/src/services/evaluaciones.service.ts`
- `backend/src/controllers/evaluaciones.controller.ts`
- `backend/src/routes/evaluaciones.routes.ts`
- `frontend/src/app/dashboard/facturacion/page.tsx`
- `frontend/src/app/dashboard/evaluaciones/page.tsx`
- `frontend/src/components/StarRating.tsx`

### Modificar:
- `backend/src/app.ts` — registrar rutas facturas y evaluaciones
- `frontend/src/types/index.ts` — agregar interfaces Factura, Evaluacion, etc.
- `frontend/src/lib/api.ts` — agregar funciones API
- `frontend/src/app/dashboard/layout.tsx` — agregar menu items
- `frontend/src/components/Icon.tsx` — agregar iconos invoice y star
- `frontend/src/app/dashboard/mis-solicitudes/page.tsx` — agregar boton evaluar
