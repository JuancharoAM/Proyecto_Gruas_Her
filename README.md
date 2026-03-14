# Sistema de Gestión — Grúas Heredianas Gimome S.A.

Sistema integral para la gestión operativa y administrativa de una empresa de grúas. Centraliza el control de unidades (camiones/grúas), choferes, solicitudes de servicio y operaciones diarias.

---

## 📋 Tabla de Contenidos

- [Tecnologías](#-tecnologías)
- [Arquitectura](#-arquitectura)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Ejecución](#-instalación-y-ejecución)
- [Acceso al Sistema](#-acceso-al-sistema)
- [Módulos del Sistema](#-módulos-del-sistema)
- [API REST — Endpoints](#-api-rest--endpoints)
- [Base de Datos](#-base-de-datos)
- [Acceso por Red Local](#-acceso-por-red-local)
- [Diseño Visual](#-diseño-visual)
- [Variables de Entorno](#-variables-de-entorno)
- [Comandos Útiles](#-comandos-útiles)

---

## 🛠 Tecnologías

| Capa        | Tecnología                              |
|-------------|----------------------------------------|
| **Frontend**  | Next.js 14, TypeScript, CSS (glassmorphism) |
| **Backend**   | Node.js, Express.js, TypeScript          |
| **Base de datos** | SQL Server 2022 Express                |
| **Contenedores** | Docker, Docker Compose V2              |
| **Autenticación** | JWT (JSON Web Tokens), bcrypt         |

---

## 🏛 Arquitectura

```
┌─────────────────── Docker Compose ──────────────────┐
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │         FRONTEND (Next.js) :3006              │  │
│  │         HTML + CSS + TypeScript               │  │
│  │         Diseño Liquid Glass / Dark Mode       │  │
│  └──────────────────┬────────────────────────────┘  │
│                     │ HTTP/REST (fetch)              │
│  ┌──────────────────▼────────────────────────────┐  │
│  │        BACKEND (Node.js + Express) :4000      │  │
│  │  Rutas, Controllers, Services, Middleware     │  │
│  └──────────────────┬────────────────────────────┘  │
│                     │ mssql (driver)                 │
│  ┌──────────────────▼────────────────────────────┐  │
│  │         SQL Server 2022 :1433                 │  │
│  │         (externo :1435)                       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto

```
Proyecto_Gruas_Her/
├── backend/                        # API REST (Node.js + Express)
│   ├── src/
│   │   ├── app.ts                  # Punto de entrada del servidor
│   │   ├── config/
│   │   │   └── database.ts        # Pool de conexiones SQL Server
│   │   ├── controllers/            # Controladores HTTP
│   │   │   ├── auth.controller.ts
│   │   │   ├── usuarios.controller.ts
│   │   │   ├── camiones.controller.ts
│   │   │   └── solicitudes.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts             # Verificación JWT
│   │   │   └── roleCheck.ts        # Control de acceso por rol
│   │   ├── routes/                 # Definición de rutas REST
│   │   │   ├── auth.routes.ts
│   │   │   ├── usuarios.routes.ts
│   │   │   ├── camiones.routes.ts
│   │   │   └── solicitudes.routes.ts
│   │   └── services/               # Lógica de negocio y queries SQL
│   │       ├── auth.service.ts
│   │       ├── usuarios.service.ts
│   │       ├── camiones.service.ts
│   │       └── solicitudes.service.ts
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
│
├── frontend/                       # Aplicación web (Next.js 14)
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css         # Sistema de diseño global
│   │   │   ├── layout.tsx          # Layout raíz
│   │   │   ├── page.tsx            # Redirect al login
│   │   │   ├── login/              # Página de inicio de sesión
│   │   │   │   ├── page.tsx
│   │   │   │   └── login.css
│   │   │   └── dashboard/          # Panel principal
│   │   │       ├── layout.tsx      # Sidebar + Header + Auth guard
│   │   │       ├── page.tsx        # Métricas y estadísticas
│   │   │       ├── dashboard.css
│   │   │       ├── solicitudes/    # Gestión de solicitudes
│   │   │       │   └── page.tsx
│   │   │       ├── camiones/       # Gestión de flota
│   │   │       │   └── page.tsx
│   │   │       └── usuarios/       # Gestión de usuarios
│   │   │           └── page.tsx
│   │   ├── components/
│   │   │   └── Icon.tsx            # Componente de iconos SVG
│   │   ├── lib/
│   │   │   └── api.ts              # Wrapper HTTP para el backend
│   │   └── types/
│   │       └── index.ts            # Interfaces TypeScript
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
│
├── database/
│   └── init.sql                    # Script de creación de BD y datos semilla
│
├── docker-compose.yml              # Orquestación de los 3 servicios
└── README.md                       # Este archivo
```

---

## ✅ Requisitos Previos

- **Docker** (versión 20+)
- **Docker Compose** V2
- Puerto **3006** libre (frontend)
- Puerto **4000** libre (backend API)
- Puerto **1435** libre (SQL Server externo)

---

## 🚀 Instalación y Ejecución

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Proyecto_Gruas_Her
```

### 2. Levantar todos los servicios

```bash
sudo docker compose up --build -d
```

Esto automáticamente:
- Descarga la imagen de SQL Server 2022
- Compila el backend (TypeScript → JavaScript)
- Compila el frontend (Next.js → standalone)
- Crea la base de datos `gruas_heredianas` con las tablas y datos iniciales
- Inicia los 3 servicios conectados en red interna

### 3. Verificar que todo está corriendo

```bash
sudo docker compose ps
```

Los 3 contenedores deben estar en estado `Up` / `Healthy`.

---

## 🔐 Acceso al Sistema

Una vez levantado, acceder a:

| Servicio    | URL                        |
|-------------|----------------------------|
| **Frontend**  | http://localhost:3006       |
| **API REST**  | http://localhost:4000       |
| **Health Check** | http://localhost:4000/api/health |

### Credenciales por defecto

| Campo       | Valor                            |
|-------------|----------------------------------|
| **Email**     | `admin@gruasheredianas.com`      |
| **Contraseña**| `admin123`                       |
| **Rol**       | Administrador                    |

> ⚠️ **Cambiar la contraseña del administrador en producción.**

---

## 📦 Módulos del Sistema

### Fase 1 — Base del Sistema (Implementada)

| Módulo | Descripción |
|--------|-------------|
| **Autenticación** | Login con JWT, manejo de sesiones, roles de usuario (Administrador, Chofer, Logística, Técnico, Cliente) |
| **Dashboard** | Métricas generales: solicitudes activas, flota disponible, servicios del día |
| **Gestión de Flota** | CRUD de camiones/grúas, estados operativos, asignación de choferes |
| **Solicitudes de Servicio** | Registro, asignación de grúa/chofer, seguimiento por estados, reasignación de grúa/chofer en solicitudes activas |
| **Gestión de Usuarios** | CRUD de usuarios, asignación de roles, activar/desactivar cuentas |
| **Gestión de Choferes** | Listado de choferes, monitoreo, registro rápido y forzado de estados de servicio |
| **Mis Servicios (Chofer)** | Panel Mobile-First para gestionar solicitudes y transiciones (`En camino`, `Atendiendo`, `Finalizada`) |
| **Gestión de Clientes** | CRUD de clientes, historial de servicios |

### Fase 2 — Mantenimiento y Combustible (Implementada)

| Módulo | Descripción |
|--------|-------------|
| **Mantenimiento de Equipos** | Registro de mantenimientos preventivos/correctivos, bloqueo automático de grúas en mantenimiento |
| **Control de Combustible** | Registro de cargas de combustible, historial por camión |

### Fase 3 — Notificaciones (Implementada)

| Módulo | Descripción |
|--------|-------------|
| **Notificaciones Internas** | Sistema de notificaciones en tiempo real (polling 30s), badge con conteo de no leídas, marcar como leídas, limpiar todas. Notificaciones automáticas en asignación, reasignación y cambio de estado de solicitudes. Panel responsive (pantalla completa en móvil). |

### Fases Futuras

| Fase | Módulos |
|------|---------|
| 4 | Facturación y cobros |
| 5 | Evaluación del servicio (calificaciones) |
| 6 | Ubicación GPS en mapa |
| 7 | Inventario, Reportes avanzados, Alertas del sistema |

---

## 🌐 API REST — Endpoints

### Autenticación
| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/api/auth/login` | Iniciar sesión | Todos |
| GET | `/api/auth/me` | Datos del usuario actual | Autenticado |

### Usuarios
| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/usuarios` | Listar usuarios | Admin |
| GET | `/api/usuarios/roles` | Listar roles | Admin |
| POST | `/api/usuarios` | Crear usuario | Admin |
| PUT | `/api/usuarios/:id` | Actualizar usuario | Admin |
| DELETE | `/api/usuarios/:id` | Desactivar usuario | Admin |

### Camiones (Flota)
| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/camiones` | Listar camiones | Admin, Logística |
| GET | `/api/camiones/tipos` | Listar tipos de grúa | Admin, Logística |
| POST | `/api/camiones` | Crear camión | Admin |
| PUT | `/api/camiones/:id` | Actualizar camión | Admin |

### Solicitudes de Servicio
| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/solicitudes` | Listar solicitudes | Admin, Logística |
| POST | `/api/solicitudes` | Crear solicitud | Admin, Logística |
| PUT | `/api/solicitudes/:id` | Actualizar solicitud | Admin, Logística |
| PUT | `/api/solicitudes/:id/asignar` | Asignar grúa y chofer | Admin, Logística |
| PUT | `/api/solicitudes/:id/reasignar` | Reasignar grúa y chofer | Admin, Logística |
| PUT | `/api/solicitudes/:id/estado` | Actualizar estado servicio | Chofer, Admin, Logística |
| DELETE | `/api/solicitudes/:id` | Eliminar solicitud | Admin |

### Choferes y Estados
| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/api/usuarios/choferes` | Crear chofer | Admin, Logística |
| GET | `/api/solicitudes/mis-servicios` | Listar servicios del chofer | Chofer |

### Notificaciones
| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/notificaciones` | Listar notificaciones del usuario | Autenticado |
| GET | `/api/notificaciones/no-leidas` | Contar no leídas | Autenticado |
| PUT | `/api/notificaciones/:id/leer` | Marcar como leída | Autenticado |
| PUT | `/api/notificaciones/leer-todas` | Marcar todas como leídas | Autenticado |
| DELETE | `/api/notificaciones/:id` | Eliminar notificación | Autenticado |
| DELETE | `/api/notificaciones/limpiar` | Eliminar todas | Autenticado |

### Dashboard
| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/dashboard/stats` | Estadísticas generales | Admin, Logística |

---

## 🗄 Base de Datos

### Tablas

| Tabla | Descripción |
|-------|-------------|
| `roles` | Roles del sistema (Administrador, Chofer, Logística, Técnico, Cliente) |
| `usuarios` | Usuarios con credenciales y rol asignado |
| `tipos_grua` | Catálogo de tipos (Plataforma, Arrastre, Elevación) |
| `camiones` | Flota de grúas con estado operativo |
| `solicitudes` | Solicitudes de servicio con ciclo de vida completo |
| `mantenimientos` | Registro de mantenimientos preventivos y correctivos |
| `combustible` | Registro de cargas de combustible por camión |
| `clientes` | Clientes con datos de contacto |
| `notificaciones` | Notificaciones internas por usuario |

### Conexión Externa

Para conectarse a la base de datos desde el host (ej. con SQL Server Management Studio):

| Parámetro | Valor |
|-----------|-------|
| **Servidor** | `localhost,1435` |
| **Usuario** | `sa` |
| **Contraseña** | `GruasHer2026_Strong!` |
| **Base de datos** | `gruas_heredianas` |

---

## 🌍 Acceso por Red Local

El sistema puede accederse desde cualquier dispositivo en la misma red local.

Desde otro equipo, usar la IP del servidor:
```
http://<IP-DEL-SERVIDOR>:3006
```

El frontend detecta dinámicamente el hostname y redirige las peticiones API al mismo host en el puerto `4000`.

---

## 🎨 Diseño Visual

- **Paleta de colores:** `#FAF3E1` (crema), `#F5E7C6` (beige), `#FA8112` (naranja principal), `#222222` (texto)
- **Estilo:** Minimalista con efecto *Liquid Glass* (gradientes radiales animados)
- **Iconos:** SVG inline mediante componente `Icon.tsx`
- **Tipografía:** Google Font **Inter**
- **Modo oscuro:** Toggle disponible en login y dashboard, persistido en `localStorage`

---

## ⚙️ Variables de Entorno

### Backend (`docker-compose.yml`)

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DB_SERVER` | `sqlserver` | Host de la BD (nombre del servicio Docker) |
| `DB_PORT` | `1433` | Puerto interno de SQL Server |
| `DB_DATABASE` | `gruas_heredianas` | Nombre de la base de datos |
| `DB_USER` | `sa` | Usuario de la BD |
| `DB_PASSWORD` | `GruasHer2026_Strong!` | Contraseña de la BD |
| `JWT_SECRET` | `gruas_heredianas_jwt_secret_2026` | Clave secreta para firmar tokens |
| `PORT` | `4000` | Puerto del servidor API |

---

## 🧰 Comandos Útiles

```bash
# Levantar todo el sistema
sudo docker compose up --build -d

# Ver logs en tiempo real
sudo docker compose logs -f

# Ver logs de un servicio específico
sudo docker compose logs -f backend
sudo docker compose logs -f frontend

# Detener todos los servicios
sudo docker compose down

# Detener y eliminar datos de la BD
sudo docker compose down -v

# Reconstruir un servicio específico sin caché
sudo docker compose build --no-cache frontend
sudo docker compose up -d

# Ver estado de los contenedores
sudo docker compose ps

# Acceder al contenedor de SQL Server
sudo docker exec -it gruas_sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "GruasHer2026_Strong!" -C -No
```

---

## 📄 Licencia

Proyecto desarrollado para **Grúas Heredianas Gimome S.A.** — Uso interno.

---

*Desarrollado con Next.js, Node.js, SQL Server y Docker.*
