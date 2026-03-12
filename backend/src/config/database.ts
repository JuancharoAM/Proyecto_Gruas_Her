/**
 * ============================================================================
 * Configuración de conexión a SQL Server
 * ============================================================================
 * 
 * Este módulo configura y exporta un pool de conexiones a SQL Server
 * utilizando la librería 'mssql'. El pool se reutiliza en toda la
 * aplicación para evitar crear conexiones nuevas en cada consulta.
 * 
 * Las credenciales se leen desde variables de entorno (.env).
 * ============================================================================
 */

import sql from 'mssql';
import dotenv from 'dotenv';

// Cargar variables de entorno desde el archivo .env
dotenv.config();

/**
 * Configuración de conexión a SQL Server.
 * Los valores se obtienen de las variables de entorno definidas en .env
 * o en docker-compose.yml.
 */
const dbConfig: sql.config = {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    database: process.env.DB_DATABASE || 'gruas_heredianas',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
        encrypt: false,              // No requerido en red local
        trustServerCertificate: true, // Aceptar certificados auto-firmados
        enableArithAbort: true,       // Requerido por SQL Server
    },
    pool: {
        max: 10,        // Máximo de conexiones simultáneas en el pool
        min: 0,         // Mínimo de conexiones mantenidas
        idleTimeoutMillis: 30000,  // Tiempo antes de cerrar una conexión inactiva
    },
};

/**
 * Pool de conexiones global.
 * Se inicializa una sola vez y se reutiliza en toda la aplicación.
 */
let pool: sql.ConnectionPool | null = null;

/**
 * Obtiene el pool de conexiones a SQL Server.
 * Si no existe, crea uno nuevo. Si ya existe, devuelve el existente.
 * 
 * @returns {Promise<sql.ConnectionPool>} Pool de conexiones activo
 * 
 * @example
 * const pool = await getPool();
 * const result = await pool.request().query('SELECT * FROM usuarios');
 */
export async function getPool(): Promise<sql.ConnectionPool> {
    if (!pool) {
        // Reintentar la conexión hasta 5 veces (útil cuando SQL Server aún está arrancando)
        const maxRetries = 5;
        const retryDelay = 5000; // 5 segundos entre reintentos

        for (let intento = 1; intento <= maxRetries; intento++) {
            try {
                pool = await sql.connect(dbConfig);
                console.log('✅ Conexión a SQL Server establecida correctamente');
                return pool;
            } catch (error: any) {
                console.log(`⏳ Intento ${intento}/${maxRetries} — No se pudo conectar: ${error.message}`);
                if (intento === maxRetries) {
                    throw error; // Ya no hay más reintentos
                }
                // Esperar antes de reintentar
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }
    return pool!;
}

/**
 * Cierra la conexión al pool de SQL Server.
 * Se debe llamar al apagar la aplicación para liberar recursos.
 */
export async function closePool(): Promise<void> {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('🔌 Conexión a SQL Server cerrada');
    }
}

export default { getPool, closePool };
