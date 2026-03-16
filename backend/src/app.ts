/**
 * ============================================================================
 * Punto de Entrada - API REST Grúas Heredianas
 * ============================================================================
 * 
 * Configura y arranca el servidor Express con:
 * - Middleware global (CORS, JSON parser)
 * - Rutas de la API organizadas por módulo
 * - Conexión a SQL Server
 * - Manejo de cierre limpio (graceful shutdown)
 * 
 * Puertos:
 * - API: 4000 (configurable vía variable de entorno PORT)
 * ============================================================================
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getPool, closePool } from './config/database';

// Importar rutas de cada módulo
import authRoutes from './routes/auth.routes';
import usuariosRoutes from './routes/usuarios.routes';
import camionesRoutes from './routes/camiones.routes';
import solicitudesRoutes from './routes/solicitudes.routes';
import mantenimientosRoutes from './routes/mantenimientos.routes';
import combustibleRoutes from './routes/combustible.routes';
import clientesRoutes from './routes/clientes.routes';
import notificacionesRoutes from './routes/notificaciones.routes';
import reportesRoutes from './routes/reportes.routes';

// Cargar variables de entorno
dotenv.config();

// Crear la aplicación Express
const app = express();
const PORT = process.env.PORT || 4000;

// ============================================================================
// MIDDLEWARE GLOBAL
// ============================================================================

// Habilitar CORS para permitir peticiones desde el frontend en cualquier IP de la red local
app.use(cors({
    origin: true, // Permite cualquier origen (necesario para acceso por IP de red)
    credentials: true,
}));

// Parsear el body de las peticiones como JSON
app.use(express.json());

// Log simple de peticiones (útil para depuración)
app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
    next();
});

// ============================================================================
// RUTAS DE LA API
// ============================================================================

// Ruta de health check (para Docker y monitoreo)
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Módulos de la API
app.use('/api/auth', authRoutes);           // Autenticación: login, perfil
app.use('/api/usuarios', usuariosRoutes);   // Gestión de usuarios (Admin)
app.use('/api/camiones', camionesRoutes);   // Gestión de flota
app.use('/api/solicitudes', solicitudesRoutes); // Solicitudes de servicio
app.use('/api/mantenimientos', mantenimientosRoutes); // Mantenimientos de flota
app.use('/api/combustible', combustibleRoutes);       // Cargas de combustible
app.use('/api/clientes', clientesRoutes);       // Gestión de clientes
app.use('/api/notificaciones', notificacionesRoutes); // Notificaciones internas
app.use('/api/reportes', reportesRoutes);             // Reportes y estadísticas

// Ruta del dashboard (definida en solicitudes pero montada aquí)
import { obtenerEstadisticas } from './controllers/solicitudes.controller';
import { authMiddleware } from './middleware/auth';
import { roleCheck } from './middleware/roleCheck';
app.get('/api/dashboard/stats', authMiddleware, roleCheck(['Administrador', 'Logística']), obtenerEstadisticas);

// ============================================================================
// MANEJO DE ERRORES
// ============================================================================

// Ruta no encontrada (404)
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada. Verifique la URL e intente de nuevo.',
    });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

async function iniciarServidor() {
    try {
        // Conectar a SQL Server
        console.log('🔄 Conectando a SQL Server...');
        await getPool();

        // Iniciar el servidor HTTP
        app.listen(PORT, () => {
            console.log(`🚀 Servidor API iniciado en http://localhost:${PORT}`);
            console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🔑 Login: POST http://localhost:${PORT}/api/auth/login`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// Manejo de cierre limpio (Ctrl+C, Docker stop, etc.)
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Recibida señal SIGTERM, cerrando...');
    await closePool();
    process.exit(0);
});

// Arrancar
iniciarServidor();
