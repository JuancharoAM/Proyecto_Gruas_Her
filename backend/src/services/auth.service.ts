/**
 * ============================================================================
 * Servicio de Autenticación
 * ============================================================================
 * 
 * Contiene la lógica de negocio para el proceso de autenticación:
 * - Validar credenciales del usuario contra la base de datos
 * - Generar tokens JWT para sesiones activas
 * - Obtener información del usuario autenticado
 * 
 * Este servicio es utilizado por el controlador de autenticación
 * (auth.controller.ts) y NO interactúa directamente con HTTP.
 * ============================================================================
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/database';

/**
 * Interfaz que define la estructura de un usuario retornado por el servicio.
 * No incluye el hash de la contraseña por seguridad.
 */
export interface UsuarioAuth {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    rolId: number;
}

/**
 * Resultado del proceso de login.
 * Incluye el token JWT y los datos básicos del usuario.
 */
export interface LoginResult {
    token: string;
    usuario: UsuarioAuth;
}

/**
 * Intenta autenticar a un usuario con email y contraseña.
 * 
 * Proceso:
 * 1. Busca el usuario en la BD por email
 * 2. Verifica que la cuenta esté activa
 * 3. Compara la contraseña con el hash almacenado
 * 4. Genera un token JWT con los datos del usuario
 * 5. Actualiza la fecha del último acceso
 * 
 * @param email - Correo electrónico del usuario
 * @param password - Contraseña en texto plano
 * @returns Datos del usuario y token JWT, o null si las credenciales son inválidas
 */
export async function loginUsuario(email: string, password: string): Promise<LoginResult | null> {
    const pool = await getPool();

    // Buscar el usuario por email, incluyendo el nombre del rol
    const result = await pool.request()
        .input('email', email)
        .query(`
            SELECT 
                u.id, 
                u.nombre, 
                u.email, 
                u.password_hash,
                u.activo,
                r.id AS rol_id, 
                r.nombre AS rol_nombre
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
            WHERE u.email = @email
        `);

    // Si no se encontró el usuario, retornar null
    if (result.recordset.length === 0) {
        return null;
    }

    const usuario = result.recordset[0];

    // Verificar que la cuenta esté activa
    if (!usuario.activo) {
        throw new Error('USUARIO_INACTIVO');
    }

    // Comparar la contraseña proporcionada con el hash almacenado
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
        return null;
    }

    // Generar token JWT con los datos del usuario
    const secret = process.env.JWT_SECRET || 'default_secret';
    // Duración del token en segundos (8 horas por defecto)
    const expiresInSeconds = 8 * 60 * 60;

    const token = jwt.sign(
        {
            userId: usuario.id,
            email: usuario.email,
            rol: usuario.rol_nombre,
            rolId: usuario.rol_id,
        },
        secret,
        { expiresIn: expiresInSeconds }
    );

    // Actualizar la fecha del último acceso
    await pool.request()
        .input('id', usuario.id)
        .query('UPDATE usuarios SET ultimo_acceso = GETDATE() WHERE id = @id');

    return {
        token,
        usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol_nombre,
            rolId: usuario.rol_id,
        },
    };
}

/**
 * Obtiene los datos de un usuario por su ID.
 * Se usa para el endpoint GET /api/auth/me que devuelve
 * la información del usuario autenticado actualmente.
 * 
 * @param userId - ID del usuario a buscar
 * @returns Datos del usuario o null si no existe
 */
export async function obtenerUsuarioPorId(userId: number): Promise<UsuarioAuth | null> {
    const pool = await getPool();

    const result = await pool.request()
        .input('id', userId)
        .query(`
            SELECT 
                u.id, 
                u.nombre, 
                u.email, 
                r.id AS rol_id, 
                r.nombre AS rol_nombre
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
            WHERE u.id = @id AND u.activo = 1
        `);

    if (result.recordset.length === 0) {
        return null;
    }

    const u = result.recordset[0];
    return {
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol_nombre,
        rolId: u.rol_id,
    };
}
