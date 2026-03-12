/**
 * ============================================================================
 * Script de Seed - Datos Iniciales
 * ============================================================================
 * 
 * Este script se ejecuta después de crear las tablas para insertar
 * el usuario administrador con una contraseña hasheada correctamente.
 * 
 * Uso: npm run seed
 * ============================================================================
 */

import bcrypt from 'bcryptjs';
import { getPool, closePool } from './database';

async function seed() {
    try {
        console.log('🌱 Iniciando seed de datos...');
        const pool = await getPool();

        // Verificar si ya existe el usuario admin
        const existe = await pool.request()
            .query("SELECT id FROM usuarios WHERE email = 'admin@gruasheredianas.com'");

        if (existe.recordset.length > 0) {
            // Actualizar la contraseña del admin existente con el hash correcto
            const passwordHash = await bcrypt.hash('admin123', 10);
            await pool.request()
                .input('hash', passwordHash)
                .query("UPDATE usuarios SET password_hash = @hash WHERE email = 'admin@gruasheredianas.com'");
            console.log('✅ Contraseña del administrador actualizada.');
        } else {
            // Crear el usuario admin
            const passwordHash = await bcrypt.hash('admin123', 10);
            await pool.request()
                .input('nombre', 'Administrador')
                .input('email', 'admin@gruasheredianas.com')
                .input('hash', passwordHash)
                .input('rol_id', 1)
                .query(`
                    INSERT INTO usuarios (nombre, email, password_hash, rol_id)
                    VALUES (@nombre, @email, @hash, @rol_id)
                `);
            console.log('✅ Usuario administrador creado.');
        }

        console.log('📧 Email: admin@gruasheredianas.com');
        console.log('🔑 Contraseña: admin123');
        console.log('⚠️  Recuerde cambiar la contraseña en producción.');

        await closePool();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en seed:', error);
        process.exit(1);
    }
}

seed();
