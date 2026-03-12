/**
 * ============================================================================
 * Servicio de Usuarios
 * ============================================================================
 * 
 * Lógica de negocio para la gestión de usuarios del sistema.
 * Incluye operaciones CRUD: listar, crear, editar, y desactivar usuarios.
 * Solo los administradores pueden acceder a estas operaciones.
 * ============================================================================
 */

import bcrypt from 'bcryptjs';
import { getPool } from '../config/database';

/** Interfaz que define la estructura de un usuario en la respuesta */
export interface Usuario {
    id: number;
    nombre: string;
    email: string;
    rol_id: number;
    rol_nombre: string;
    activo: boolean;
    fecha_creacion: Date;
    ultimo_acceso: Date | null;
}

/** Datos requeridos para crear un nuevo usuario */
export interface CrearUsuarioDTO {
    nombre: string;
    email: string;
    password: string;
    rol_id: number;
}

/** Datos permitidos para actualizar un usuario existente */
export interface ActualizarUsuarioDTO {
    nombre?: string;
    email?: string;
    password?: string;
    rol_id?: number;
    activo?: boolean;
}

/**
 * Obtiene la lista de todos los usuarios del sistema.
 * Incluye el nombre del rol de cada usuario.
 * 
 * @returns Array de usuarios con sus datos (sin contraseñas)
 */
export async function listarUsuarios(): Promise<Usuario[]> {
    const pool = await getPool();

    const result = await pool.request().query(`
        SELECT 
            u.id, u.nombre, u.email, u.rol_id,
            r.nombre AS rol_nombre,
            u.activo, u.fecha_creacion, u.ultimo_acceso
        FROM usuarios u
        INNER JOIN roles r ON u.rol_id = r.id
        ORDER BY u.nombre ASC
    `);

    return result.recordset;
}

/**
 * Obtiene un usuario específico por su ID.
 * 
 * @param id - ID del usuario a buscar
 * @returns Datos del usuario o null si no existe
 */
export async function obtenerUsuarioPorId(id: number): Promise<Usuario | null> {
    const pool = await getPool();

    const result = await pool.request()
        .input('id', id)
        .query(`
            SELECT 
                u.id, u.nombre, u.email, u.rol_id,
                r.nombre AS rol_nombre,
                u.activo, u.fecha_creacion, u.ultimo_acceso
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
            WHERE u.id = @id
        `);

    return result.recordset.length > 0 ? result.recordset[0] : null;
}

/**
 * Crea un nuevo usuario en el sistema.
 * La contraseña se hashea con bcrypt antes de almacenarse.
 * 
 * @param datos - Datos del nuevo usuario (nombre, email, password, rol_id)
 * @returns El usuario creado (sin contraseña)
 * @throws Error si el email ya está registrado
 */
export async function crearUsuario(datos: CrearUsuarioDTO): Promise<Usuario> {
    const pool = await getPool();

    // Verificar que el email no esté ya registrado
    const existe = await pool.request()
        .input('email', datos.email)
        .query('SELECT id FROM usuarios WHERE email = @email');

    if (existe.recordset.length > 0) {
        throw new Error('El correo electrónico ya está registrado en el sistema.');
    }

    // Hashear la contraseña con bcrypt (10 rounds de salt)
    const passwordHash = await bcrypt.hash(datos.password, 10);

    // Insertar el nuevo usuario y obtener su ID
    const result = await pool.request()
        .input('nombre', datos.nombre)
        .input('email', datos.email)
        .input('password_hash', passwordHash)
        .input('rol_id', datos.rol_id)
        .query(`
            INSERT INTO usuarios (nombre, email, password_hash, rol_id)
            OUTPUT INSERTED.id
            VALUES (@nombre, @email, @password_hash, @rol_id)
        `);

    const nuevoId = result.recordset[0].id;

    // Retornar el usuario recién creado
    return (await obtenerUsuarioPorId(nuevoId))!;
}

/**
 * Actualiza los datos de un usuario existente.
 * Si se proporciona una nueva contraseña, se hashea antes de guardar.
 * 
 * @param id - ID del usuario a actualizar
 * @param datos - Campos a actualizar (solo los proporcionados se modifican)
 * @returns El usuario actualizado o null si no existe
 */
export async function actualizarUsuario(id: number, datos: ActualizarUsuarioDTO): Promise<Usuario | null> {
    const pool = await getPool();

    // Construir la consulta dinámicamente según los campos proporcionados
    const campos: string[] = [];
    const request = pool.request().input('id', id);

    if (datos.nombre !== undefined) {
        campos.push('nombre = @nombre');
        request.input('nombre', datos.nombre);
    }
    if (datos.email !== undefined) {
        campos.push('email = @email');
        request.input('email', datos.email);
    }
    if (datos.password !== undefined) {
        const passwordHash = await bcrypt.hash(datos.password, 10);
        campos.push('password_hash = @password_hash');
        request.input('password_hash', passwordHash);
    }
    if (datos.rol_id !== undefined) {
        campos.push('rol_id = @rol_id');
        request.input('rol_id', datos.rol_id);
    }
    if (datos.activo !== undefined) {
        campos.push('activo = @activo');
        request.input('activo', datos.activo);
    }

    // Si no hay campos que actualizar, retornar el usuario sin cambios
    if (campos.length === 0) {
        return obtenerUsuarioPorId(id);
    }

    await request.query(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = @id`);

    return obtenerUsuarioPorId(id);
}

/**
 * Obtiene la lista de todos los roles disponibles.
 * Se usa en el formulario de creación/edición de usuarios.
 * 
 * @returns Array de roles con id, nombre y descripción
 */
export async function listarRoles() {
    const pool = await getPool();

    const result = await pool.request().query(`
        SELECT id, nombre, descripcion 
        FROM roles 
        WHERE activo = 1 
        ORDER BY nombre ASC
    `);

    return result.recordset;
}
