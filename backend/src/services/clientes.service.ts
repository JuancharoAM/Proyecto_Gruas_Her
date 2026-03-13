/**
 * ============================================================================
 * Servicio de Clientes
 * ============================================================================
 *
 * Lógica de negocio para la gestión de clientes del sistema.
 * Incluye operaciones CRUD: listar, crear, editar, y desactivar clientes.
 * Opcionalmente permite crear un usuario vinculado al cliente para acceso
 * al portal con rol "Cliente".
 * ============================================================================
 */

import bcrypt from 'bcryptjs';
import { getPool } from '../config/database';

/** Interfaz que define la estructura de un cliente en la respuesta */
export interface Cliente {
    id: number;
    cedula: string;
    nombre: string;
    apellido: string;
    telefono: string;
    correo: string;
    activo: boolean;
    fecha_registro: Date;
    usuario_id: number | null;
    usuario_email: string | null;
    notas: string;
    total_solicitudes: number;
}

/** Datos requeridos para crear un nuevo cliente */
export interface CrearClienteDTO {
    cedula: string;
    nombre: string;
    apellido: string;
    telefono?: string;
    correo?: string;
    notas?: string;
    crear_usuario?: boolean;
    password?: string;
}

/** Datos permitidos para actualizar un cliente existente */
export interface ActualizarClienteDTO {
    cedula?: string;
    nombre?: string;
    apellido?: string;
    telefono?: string;
    correo?: string;
    notas?: string;
    activo?: boolean;
}

/**
 * Obtiene la lista de todos los clientes del sistema.
 * Incluye el email del usuario vinculado (si existe) y el conteo
 * de solicitudes asociadas a cada cliente.
 *
 * @returns Array de clientes con sus datos y total de solicitudes
 */
export async function listarClientes(): Promise<Cliente[]> {
    const pool = await getPool();

    const result = await pool.request().query(`
        SELECT
            c.id, c.cedula, c.nombre, c.apellido,
            c.telefono, c.correo, c.activo, c.fecha_registro,
            c.usuario_id, u.email AS usuario_email,
            c.notas,
            (SELECT COUNT(*) FROM solicitudes s WHERE s.cliente_id = c.id) AS total_solicitudes
        FROM clientes c
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        ORDER BY c.nombre ASC
    `);

    return result.recordset;
}

/**
 * Obtiene un cliente específico por su ID.
 * Incluye el email del usuario vinculado y el conteo de solicitudes.
 *
 * @param id - ID del cliente a buscar
 * @returns Datos del cliente o null si no existe
 */
export async function obtenerClientePorId(id: number): Promise<Cliente | null> {
    const pool = await getPool();

    const result = await pool.request()
        .input('id', id)
        .query(`
            SELECT
                c.id, c.cedula, c.nombre, c.apellido,
                c.telefono, c.correo, c.activo, c.fecha_registro,
                c.usuario_id, u.email AS usuario_email,
                c.notas,
                (SELECT COUNT(*) FROM solicitudes s WHERE s.cliente_id = c.id) AS total_solicitudes
            FROM clientes c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.id = @id
        `);

    return result.recordset.length > 0 ? result.recordset[0] : null;
}

/**
 * Crea un nuevo cliente en el sistema.
 * Verifica que la cédula no esté duplicada antes de insertar.
 *
 * Si se indica `crear_usuario = true` y se proporcionan `correo` y `password`,
 * se crea además un usuario en la tabla `usuarios` con rol "Cliente" y se
 * vincula automáticamente al registro del cliente.
 *
 * @param datos - Datos del nuevo cliente (cédula, nombre, apellido, etc.)
 * @returns El cliente creado con todos sus datos
 * @throws Error si la cédula ya está registrada
 * @throws Error si se solicita crear usuario pero faltan correo o password
 */
export async function crearCliente(datos: CrearClienteDTO): Promise<Cliente> {
    const pool = await getPool();

    // Verificar que la cédula no esté ya registrada
    const existe = await pool.request()
        .input('cedula', datos.cedula)
        .query('SELECT id FROM clientes WHERE cedula = @cedula');

    if (existe.recordset.length > 0) {
        throw new Error('La cédula ya está registrada en el sistema.');
    }

    let usuarioId: number | null = null;

    // Si se solicita crear un usuario vinculado al cliente
    if (datos.crear_usuario) {
        if (!datos.correo || !datos.password) {
            throw new Error('Para crear un usuario se requiere correo y contraseña.');
        }

        // Verificar que el correo no esté ya registrado como usuario
        const existeEmail = await pool.request()
            .input('email', datos.correo)
            .query('SELECT id FROM usuarios WHERE email = @email');

        if (existeEmail.recordset.length > 0) {
            throw new Error('El correo electrónico ya está registrado como usuario.');
        }

        // Obtener el ID del rol "Cliente"
        const rolResult = await pool.request()
            .input('rolNombre', 'Cliente')
            .query('SELECT id FROM roles WHERE nombre = @rolNombre');

        if (rolResult.recordset.length === 0) {
            throw new Error('El rol "Cliente" no está configurado en el sistema.');
        }

        const rolClienteId = rolResult.recordset[0].id;

        // Hashear la contraseña con bcrypt (10 rounds de salt)
        const passwordHash = await bcrypt.hash(datos.password, 10);

        // Crear el usuario con rol "Cliente"
        const nombreCompleto = `${datos.nombre} ${datos.apellido}`;
        const usuarioResult = await pool.request()
            .input('nombre', nombreCompleto)
            .input('email', datos.correo)
            .input('password_hash', passwordHash)
            .input('rol_id', rolClienteId)
            .query(`
                INSERT INTO usuarios (nombre, email, password_hash, rol_id)
                OUTPUT INSERTED.id
                VALUES (@nombre, @email, @password_hash, @rol_id)
            `);

        usuarioId = usuarioResult.recordset[0].id;
    }

    // Insertar el nuevo cliente y obtener su ID
    const result = await pool.request()
        .input('cedula', datos.cedula)
        .input('nombre', datos.nombre)
        .input('apellido', datos.apellido)
        .input('telefono', datos.telefono || null)
        .input('correo', datos.correo || null)
        .input('notas', datos.notas || null)
        .input('usuario_id', usuarioId)
        .query(`
            INSERT INTO clientes (cedula, nombre, apellido, telefono, correo, notas, usuario_id)
            OUTPUT INSERTED.id
            VALUES (@cedula, @nombre, @apellido, @telefono, @correo, @notas, @usuario_id)
        `);

    const nuevoId = result.recordset[0].id;

    // Retornar el cliente recién creado
    return (await obtenerClientePorId(nuevoId))!;
}

/**
 * Actualiza los datos de un cliente existente.
 * Solo se modifican los campos proporcionados en el DTO.
 *
 * @param id - ID del cliente a actualizar
 * @param datos - Campos a actualizar (solo los proporcionados se modifican)
 * @returns El cliente actualizado o null si no existe
 */
export async function actualizarCliente(id: number, datos: ActualizarClienteDTO): Promise<Cliente | null> {
    const pool = await getPool();

    // Construir la consulta dinámicamente según los campos proporcionados
    const campos: string[] = [];
    const request = pool.request().input('id', id);

    if (datos.cedula !== undefined) {
        campos.push('cedula = @cedula');
        request.input('cedula', datos.cedula);
    }
    if (datos.nombre !== undefined) {
        campos.push('nombre = @nombre');
        request.input('nombre', datos.nombre);
    }
    if (datos.apellido !== undefined) {
        campos.push('apellido = @apellido');
        request.input('apellido', datos.apellido);
    }
    if (datos.telefono !== undefined) {
        campos.push('telefono = @telefono');
        request.input('telefono', datos.telefono);
    }
    if (datos.correo !== undefined) {
        campos.push('correo = @correo');
        request.input('correo', datos.correo);
    }
    if (datos.notas !== undefined) {
        campos.push('notas = @notas');
        request.input('notas', datos.notas);
    }
    if (datos.activo !== undefined) {
        campos.push('activo = @activo');
        request.input('activo', datos.activo);
    }

    // Si no hay campos que actualizar, retornar el cliente sin cambios
    if (campos.length === 0) {
        return obtenerClientePorId(id);
    }

    await request.query(`UPDATE clientes SET ${campos.join(', ')} WHERE id = @id`);

    return obtenerClientePorId(id);
}

/**
 * Obtiene el historial de solicitudes de servicio de un cliente específico.
 * Incluye datos del camión asignado, chofer y usuario creador de cada solicitud.
 *
 * @param clienteId - ID del cliente cuyo historial se desea consultar
 * @returns Array de solicitudes asociadas al cliente
 */
export async function obtenerHistorialSolicitudes(clienteId: number) {
    const pool = await getPool();

    const result = await pool.request()
        .input('clienteId', clienteId)
        .query(`
            SELECT
                s.id, s.numero_servicio,
                s.cliente_nombre, s.cliente_telefono, s.cliente_email,
                s.ubicacion_origen, s.ubicacion_destino,
                s.descripcion_problema, s.tipo_servicio,
                s.estado, s.prioridad,
                s.camion_id, c.placa AS camion_placa,
                s.chofer_id, uch.nombre AS chofer_nombre,
                s.fecha_solicitud, s.fecha_asignacion,
                s.fecha_inicio_servicio, s.fecha_finalizacion,
                s.creado_por, ucr.nombre AS creador_nombre,
                s.notas_internas
            FROM solicitudes s
            LEFT JOIN camiones c ON s.camion_id = c.id
            LEFT JOIN usuarios uch ON s.chofer_id = uch.id
            INNER JOIN usuarios ucr ON s.creado_por = ucr.id
            WHERE s.cliente_id = @clienteId
            ORDER BY s.fecha_solicitud DESC
        `);

    return result.recordset;
}
