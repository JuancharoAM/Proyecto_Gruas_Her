/**
 * ============================================================================
 * Servicio de Solicitudes de Servicio
 * ============================================================================
 * 
 * Lógica de negocio para gestionar las solicitudes de servicio de grúa.
 * Incluye: listar (con filtros), crear, editar, asignar grúa a solicitud,
 * y obtener estadísticas para el dashboard.
 * 
 * Ciclo de vida de una solicitud:
 * Pendiente → Asignada → En camino → Atendiendo → Finalizada
 *                                              └→ Cancelada (en cualquier momento)
 * ============================================================================
 */

import { getPool } from '../config/database';

/** Interfaz para una solicitud completa en la respuesta */
export interface Solicitud {
    id: number;
    numero_servicio: string;
    cliente_id: number;
    cliente_nombre: string;
    cliente_telefono: string;
    cliente_email: string;
    ubicacion_origen: string;
    ubicacion_destino: string;
    descripcion_problema: string;
    tipo_servicio: string;
    estado: string;
    prioridad: string;
    camion_id: number | null;
    camion_placa: string | null;
    chofer_id: number | null;
    chofer_nombre: string | null;
    fecha_solicitud: Date;
    fecha_asignacion: Date | null;
    fecha_inicio_servicio: Date | null;
    fecha_finalizacion: Date | null;
    creado_por: number;
    creador_nombre: string;
    notas_internas: string;
}

/** Datos requeridos para crear una nueva solicitud */
export interface CrearSolicitudDTO {
    cliente_id: number;
    ubicacion_origen: string;
    ubicacion_destino?: string;
    descripcion_problema?: string;
    tipo_servicio?: string;
    prioridad?: string;
    creado_por: number;
    notas_internas?: string;
}

/** Datos permitidos para editar una solicitud existente */
export interface ActualizarSolicitudDTO {
    ubicacion_origen?: string;
    ubicacion_destino?: string;
    descripcion_problema?: string;
    tipo_servicio?: string;
    prioridad?: string;
    notas_internas?: string;
}

/** Datos para asignar una grúa a una solicitud */
export interface AsignarGruaDTO {
    camion_id: number;
    chofer_id: number;
}

/**
 * Genera automáticamente un número de servicio único.
 * Formato: SRV-YYYY-NNNN (ej: SRV-2026-0001)
 * 
 * @returns Número de servicio generado
 */
async function generarNumeroServicio(): Promise<string> {
    const pool = await getPool();
    const anio = new Date().getFullYear();

    // Obtener el último número de servicio del año actual
    const result = await pool.request()
        .input('prefijo', `SRV-${anio}-%`)
        .query(`
            SELECT TOP 1 numero_servicio 
            FROM solicitudes 
            WHERE numero_servicio LIKE @prefijo
            ORDER BY id DESC
        `);

    let siguiente = 1;
    if (result.recordset.length > 0) {
        // Extraer el número secuencial del último servicio
        const ultimoNumero = result.recordset[0].numero_servicio;
        const partes = ultimoNumero.split('-');
        siguiente = parseInt(partes[2]) + 1;
    }

    // Formatear con ceros a la izquierda (4 dígitos)
    return `SRV-${anio}-${siguiente.toString().padStart(4, '0')}`;
}

/**
 * Obtiene la lista de solicitudes, con filtro opcional por estado.
 * Incluye datos del camión asignado, chofer y usuario creador.
 * 
 * @param filtroEstado - (Opcional) Filtrar por estado: 'Pendiente', 'Asignada', etc.
 * @returns Array de solicitudes
 */
export async function listarSolicitudes(filtroEstado?: string): Promise<Solicitud[]> {
    const pool = await getPool();
    const request = pool.request();

    let whereClause = '';
    if (filtroEstado && filtroEstado !== 'Todas') {
        whereClause = 'WHERE s.estado = @estado';
        request.input('estado', filtroEstado);
    }

    const result = await request.query(`
        SELECT 
            s.id, s.numero_servicio,
            s.cliente_id, s.cliente_nombre, s.cliente_telefono, s.cliente_email,
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
        ${whereClause}
        ORDER BY s.fecha_solicitud DESC
    `);

    return result.recordset;
}

/**
 * Obtiene la lista de solicitudes asignadas específicamente a un chofer.
 * Excluye las canceladas por defecto para mantener limpia la lista de trabajo móvil.
 * 
 * @param choferId - ID del chofer autenticado
 * @returns Array de solicitudes asignadas
 */
export async function listarServiciosChofer(choferId: number): Promise<Solicitud[]> {
    const pool = await getPool();

    const result = await pool.request()
        .input('choferId', choferId)
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
            WHERE s.chofer_id = @choferId AND s.estado != 'Cancelada'
            ORDER BY 
                CASE s.estado
                    WHEN 'Atendiendo' THEN 1
                    WHEN 'En camino' THEN 2
                    WHEN 'Asignada' THEN 3
                    WHEN 'Finalizada' THEN 4
                    ELSE 5
                END,
                s.fecha_asignacion DESC
        `);

    return result.recordset;
}

/**
 * Obtiene la lista de solicitudes creadas por un usuario con rol Cliente.
 * Busca por el campo creado_por que corresponde al userId del cliente.
 *
 * @param userId - ID del usuario cliente autenticado
 * @returns Array de solicitudes del cliente
 */
export async function listarSolicitudesCliente(userId: number): Promise<Solicitud[]> {
    const pool = await getPool();

    const result = await pool.request()
        .input('userId', userId)
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
            WHERE s.creado_por = @userId
            ORDER BY s.fecha_solicitud DESC
        `);

    return result.recordset;
}

/**
 * Verifica si un usuario cliente tiene una solicitud activa (en curso).
 * Estados activos: Pendiente, Asignada, En camino, Atendiendo.
 *
 * @param userId - ID del usuario cliente
 * @returns true si tiene una solicitud activa
 */
export async function clienteTieneSolicitudActiva(userId: number): Promise<boolean> {
    const pool = await getPool();

    const result = await pool.request()
        .input('userId', userId)
        .query(`
            SELECT COUNT(*) AS activas
            FROM solicitudes
            WHERE creado_por = @userId
              AND estado IN ('Pendiente', 'Asignada', 'En camino', 'Atendiendo')
        `);

    return result.recordset[0].activas > 0;
}

/**
 * Obtiene una solicitud específica por su ID.
 * 
 * @param id - ID de la solicitud
 * @returns Datos completos de la solicitud o null
 */
export async function obtenerSolicitudPorId(id: number): Promise<Solicitud | null> {
    const pool = await getPool();

    const result = await pool.request()
        .input('id', id)
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
            WHERE s.id = @id
        `);

    return result.recordset.length > 0 ? result.recordset[0] : null;
}

/**
 * Crea una nueva solicitud de servicio de grúa.
 * Se genera automáticamente un número de servicio único.
 * El estado inicial es 'Pendiente'.
 * 
 * @param datos - Datos de la solicitud (cliente, ubicación, descripción)
 * @returns La solicitud recién creada
 */
export async function crearSolicitud(datos: CrearSolicitudDTO): Promise<Solicitud> {
    const pool = await getPool();

    // Obtener datos del cliente para el snapshot
    const clienteResult = await pool.request()
        .input('cliente_id', datos.cliente_id)
        .query(`SELECT nombre, apellido, telefono, correo FROM clientes WHERE id = @cliente_id AND activo = 1`);

    if (clienteResult.recordset.length === 0) {
        throw new Error('Cliente no encontrado o inactivo.');
    }
    const cliente = clienteResult.recordset[0];
    const clienteNombre = `${cliente.nombre} ${cliente.apellido}`.trim();

    // Generar número de servicio automático
    const numeroServicio = await generarNumeroServicio();

    const result = await pool.request()
        .input('numero_servicio', numeroServicio)
        .input('cliente_id', datos.cliente_id)
        .input('cliente_nombre', clienteNombre)
        .input('cliente_telefono', cliente.telefono || null)
        .input('cliente_email', cliente.correo || null)
        .input('ubicacion_origen', datos.ubicacion_origen)
        .input('ubicacion_destino', datos.ubicacion_destino || null)
        .input('descripcion_problema', datos.descripcion_problema || null)
        .input('tipo_servicio', datos.tipo_servicio || 'Estándar')
        .input('prioridad', datos.prioridad || 'Normal')
        .input('creado_por', datos.creado_por)
        .input('notas_internas', datos.notas_internas || null)
        .query(`
            INSERT INTO solicitudes
                (numero_servicio, cliente_id, cliente_nombre, cliente_telefono, cliente_email,
                 ubicacion_origen, ubicacion_destino, descripcion_problema,
                 tipo_servicio, prioridad, creado_por, notas_internas)
            OUTPUT INSERTED.id
            VALUES
                (@numero_servicio, @cliente_id, @cliente_nombre, @cliente_telefono, @cliente_email,
                 @ubicacion_origen, @ubicacion_destino, @descripcion_problema,
                 @tipo_servicio, @prioridad, @creado_por, @notas_internas)
        `);

    const nuevoId = result.recordset[0].id;
    return (await obtenerSolicitudPorId(nuevoId))!;
}

/**
 * Asigna una grúa y un chofer a una solicitud pendiente.
 * 
 * Proceso:
 * 1. Verifica que la solicitud exista y esté en estado 'Pendiente'
 * 2. Verifica que el camión esté 'Disponible'
 * 3. Asigna el camión y chofer a la solicitud
 * 4. Cambia el estado de la solicitud a 'Asignada'
 * 5. Cambia el estado del camión a 'En servicio'
 * 
 * @param solicitudId - ID de la solicitud a asignar
 * @param datos - Camión y chofer a asignar
 * @returns Solicitud actualizada
 * @throws Error si la solicitud o camión no están en el estado correcto
 */
export async function asignarGrua(solicitudId: number, datos: AsignarGruaDTO): Promise<Solicitud> {
    const pool = await getPool();

    // Verificar que la solicitud existe y está pendiente
    const solicitud = await pool.request()
        .input('id', solicitudId)
        .query('SELECT estado FROM solicitudes WHERE id = @id');

    if (solicitud.recordset.length === 0) {
        throw new Error('Solicitud no encontrada.');
    }
    if (solicitud.recordset[0].estado !== 'Pendiente') {
        throw new Error('Solo se pueden asignar grúas a solicitudes en estado "Pendiente".');
    }

    // Verificar que el camión está disponible
    const camion = await pool.request()
        .input('camionId', datos.camion_id)
        .query('SELECT estado FROM camiones WHERE id = @camionId');

    if (camion.recordset.length === 0) {
        throw new Error('Camión no encontrado.');
    }
    if (camion.recordset[0].estado !== 'Disponible') {
        throw new Error('El camión seleccionado no está disponible.');
    }

    // Asignar grúa a la solicitud y cambiar estado
    await pool.request()
        .input('id', solicitudId)
        .input('camion_id', datos.camion_id)
        .input('chofer_id', datos.chofer_id)
        .query(`
            UPDATE solicitudes 
            SET camion_id = @camion_id, 
                chofer_id = @chofer_id, 
                estado = 'Asignada',
                fecha_asignacion = GETDATE()
            WHERE id = @id
        `);

    // Cambiar estado del camión a 'En servicio'
    await pool.request()
        .input('camionId', datos.camion_id)
        .query("UPDATE camiones SET estado = 'En servicio' WHERE id = @camionId");

    return (await obtenerSolicitudPorId(solicitudId))!;
}

/**
 * Reasigna una grua y/o chofer a una solicitud que ya esta asignada, en camino o atendiendo.
 *
 * Proceso:
 * 1. Verifica que la solicitud este en estado Asignada, En camino o Atendiendo
 * 2. Libera el camion anterior (si cambia)
 * 3. Verifica que el nuevo camion este disponible (si cambia)
 * 4. Asigna el nuevo camion y/o chofer
 * 5. Pone el nuevo camion en estado 'En servicio'
 */
export async function reasignarGrua(solicitudId: number, datos: AsignarGruaDTO): Promise<Solicitud> {
    const pool = await getPool();

    // Obtener solicitud actual
    const solicitud = await obtenerSolicitudPorId(solicitudId);
    if (!solicitud) {
        throw new Error('Solicitud no encontrada.');
    }

    const estadosPermitidos = ['Asignada', 'En camino', 'Atendiendo'];
    if (!estadosPermitidos.includes(solicitud.estado)) {
        throw new Error(`Solo se puede reasignar en estados: ${estadosPermitidos.join(', ')}. Estado actual: "${solicitud.estado}".`);
    }

    const cambiaCamion = datos.camion_id !== solicitud.camion_id;

    // Si cambia el camion, verificar que el nuevo este disponible
    if (cambiaCamion) {
        const camion = await pool.request()
            .input('camionId', datos.camion_id)
            .query('SELECT estado FROM camiones WHERE id = @camionId');

        if (camion.recordset.length === 0) {
            throw new Error('Camion no encontrado.');
        }
        if (camion.recordset[0].estado !== 'Disponible') {
            throw new Error('El camion seleccionado no esta disponible.');
        }
    }

    const transaction = pool.transaction();
    await transaction.begin();

    try {
        // Liberar el camion anterior si cambia
        if (cambiaCamion && solicitud.camion_id) {
            await transaction.request()
                .input('camionId', solicitud.camion_id)
                .query("UPDATE camiones SET estado = 'Disponible' WHERE id = @camionId AND estado = 'En servicio'");
        }

        // Asignar nuevo camion/chofer
        await transaction.request()
            .input('id', solicitudId)
            .input('camion_id', datos.camion_id)
            .input('chofer_id', datos.chofer_id)
            .query(`
                UPDATE solicitudes
                SET camion_id = @camion_id, chofer_id = @chofer_id
                WHERE id = @id
            `);

        // Poner el nuevo camion en servicio (si cambio)
        if (cambiaCamion) {
            await transaction.request()
                .input('camionId', datos.camion_id)
                .query("UPDATE camiones SET estado = 'En servicio' WHERE id = @camionId");
        }

        await transaction.commit();
        return (await obtenerSolicitudPorId(solicitudId))!;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

/**
 * Actualiza el estado de una solicitud a lo largo de su ciclo de vida.
 * Choferes pueden pasar de: Asignada -> En camino -> Atendiendo -> Finalizada
 * 
 * @param id - ID de la solicitud
 * @param nuevoEstado - Estado al que se desea pasar
 * @param usuarioId - ID del usuario haciendo la petición (para validación)
 * @param rol - Rol del usuario (para validación)
 * @returns Solicitud actualizada
 */
export async function actualizarEstadoSolicitud(id: number, nuevoEstado: string, usuarioId: number, rol: string): Promise<Solicitud> {
    const pool = await getPool();

    // Verificaciones iniciales
    const solicitud = await obtenerSolicitudPorId(id);
    if (!solicitud) {
        throw new Error('Solicitud no encontrada.');
    }

    // Un chofer solo puede actualizar sus PROPIAS solicitudes
    if (rol === 'Chofer' && solicitud.chofer_id !== usuarioId) {
        throw new Error('No tienes permiso para actualizar un servicio que no te pertenece.');
    }

    const estadoActual = solicitud.estado;

    // Validación de transiciones lógicas
    // Admin/Logística pueden saltarse reglas para corregir errores manuales, pero Choferes no.
    if (rol === 'Chofer') {
        const transicionesValidas: Record<string, string[]> = {
            'Asignada': ['En camino'],
            'En camino': ['Atendiendo'],
            'Atendiendo': ['Finalizada'],
            'Finalizada': [] // Finalizada ya no puede cambiarse por el chofer
        };

        if (estadoActual === nuevoEstado) {
            throw new Error(`El servicio ya se encuentra en estado '${estadoActual}'.`);
        }

        const validas = transicionesValidas[estadoActual] || [];
        if (!validas.includes(nuevoEstado)) {
            throw new Error(`Transición inválida: No se puede pasar de '${estadoActual}' a '${nuevoEstado}'.`);
        }
    }

    // Identificar la acción y de paso setear el timestamp que corresponde
    let setFechaCmd = "";
    if (nuevoEstado === 'En camino' || nuevoEstado === 'Atendiendo') {
        // En camino o Atendiendo significan que el servicio ya empezó
        if (!solicitud.fecha_inicio_servicio) {
            setFechaCmd = ", fecha_inicio_servicio = GETDATE()";
        }
    } else if (nuevoEstado === 'Finalizada') {
        if (!solicitud.fecha_finalizacion) {
            setFechaCmd = ", fecha_finalizacion = GETDATE()";
        }
    }

    // Iniciar transacción (para la actualización coordinada del camión si se finaliza)
    const transaction = pool.transaction();
    await transaction.begin();

    try {
        // 1. Actualizar estado y fecha en la solicitud
        await transaction.request()
            .input('id', id)
            .input('estado', nuevoEstado)
            .query(`
                UPDATE solicitudes
                SET estado = @estado ${setFechaCmd}
                WHERE id = @id
            `);

        // 2. Si es Finalizada o Cancelada y tiene camión asignado, liberar el camión
        if ((nuevoEstado === 'Finalizada' || nuevoEstado === 'Cancelada') && solicitud.camion_id) {
            await transaction.request()
                .input('camionId', solicitud.camion_id)
                .query(`
                    UPDATE camiones 
                    SET estado = 'Disponible' 
                    WHERE id = @camionId AND estado = 'En servicio'
                `);
        }

        await transaction.commit();
        return (await obtenerSolicitudPorId(id))!;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

/**
 * Actualiza los datos de una solicitud existente.
 * Solo modifica los campos proporcionados en el DTO.
 *
 * @param id - ID de la solicitud a actualizar
 * @param datos - Campos a actualizar
 * @returns Solicitud actualizada o null si no existe
 */
export async function actualizarSolicitud(id: number, datos: ActualizarSolicitudDTO): Promise<Solicitud | null> {
    const pool = await getPool();

    const campos: string[] = [];
    const request = pool.request().input('id', id);

    if (datos.ubicacion_origen !== undefined) { campos.push('ubicacion_origen = @ubicacion_origen'); request.input('ubicacion_origen', datos.ubicacion_origen); }
    if (datos.ubicacion_destino !== undefined) { campos.push('ubicacion_destino = @ubicacion_destino'); request.input('ubicacion_destino', datos.ubicacion_destino || null); }
    if (datos.descripcion_problema !== undefined) { campos.push('descripcion_problema = @descripcion_problema'); request.input('descripcion_problema', datos.descripcion_problema || null); }
    if (datos.tipo_servicio !== undefined) { campos.push('tipo_servicio = @tipo_servicio'); request.input('tipo_servicio', datos.tipo_servicio); }
    if (datos.prioridad !== undefined) { campos.push('prioridad = @prioridad'); request.input('prioridad', datos.prioridad); }
    if (datos.notas_internas !== undefined) { campos.push('notas_internas = @notas_internas'); request.input('notas_internas', datos.notas_internas || null); }

    if (campos.length === 0) {
        return obtenerSolicitudPorId(id);
    }

    await request.query(`UPDATE solicitudes SET ${campos.join(', ')} WHERE id = @id`);
    return obtenerSolicitudPorId(id);
}

/**
 * Elimina una solicitud de servicio de forma permanente.
 * Si la solicitud tiene un camión asignado en estado "En servicio",
 * lo libera cambiando su estado a "Disponible".
 *
 * @param id - ID de la solicitud a eliminar
 * @returns true si se eliminó, false si no existe
 */
export async function eliminarSolicitud(id: number): Promise<boolean> {
    const pool = await getPool();

    // Obtener la solicitud para verificar si tiene camión asignado
    const solicitud = await obtenerSolicitudPorId(id);
    if (!solicitud) return false;

    // No permitir eliminar solicitudes finalizadas
    if (solicitud.estado === 'Finalizada') {
        throw new Error('No se puede eliminar una solicitud que ya fue finalizada.');
    }

    const transaction = pool.transaction();
    await transaction.begin();

    try {
        // Si tiene camión asignado y el servicio no ha finalizado, liberar el camión
        if (solicitud.camion_id && solicitud.estado !== 'Finalizada' && solicitud.estado !== 'Cancelada') {
            await transaction.request()
                .input('camionId', solicitud.camion_id)
                .query("UPDATE camiones SET estado = 'Disponible' WHERE id = @camionId AND estado = 'En servicio'");
        }

        // Eliminar la solicitud
        const result = await transaction.request()
            .input('id', id)
            .query('DELETE FROM solicitudes WHERE id = @id');

        await transaction.commit();
        return (result.rowsAffected[0] || 0) > 0;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

/**
 * Obtiene estadísticas de solicitudes para el dashboard.
 * Incluye conteos por estado y solicitudes recientes.
 *
 * @returns Objeto con estadísticas de solicitudes
 */
export async function obtenerEstadisticasSolicitudes() {
    const pool = await getPool();

    // Conteo por estado
    const estadosResult = await pool.request().query(`
        SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) AS pendientes,
            SUM(CASE WHEN estado = 'Asignada' THEN 1 ELSE 0 END) AS asignadas,
            SUM(CASE WHEN estado = 'En camino' THEN 1 ELSE 0 END) AS en_camino,
            SUM(CASE WHEN estado = 'Atendiendo' THEN 1 ELSE 0 END) AS atendiendo,
            SUM(CASE WHEN estado = 'Finalizada' THEN 1 ELSE 0 END) AS finalizadas,
            SUM(CASE WHEN estado = 'Cancelada' THEN 1 ELSE 0 END) AS canceladas
        FROM solicitudes
    `);

    // Solicitudes del día actual
    const hoyResult = await pool.request().query(`
        SELECT COUNT(*) AS solicitudes_hoy
        FROM solicitudes
        WHERE CAST(fecha_solicitud AS DATE) = CAST(GETDATE() AS DATE)
    `);

    // Últimas 5 solicitudes (para vista rápida en dashboard)
    const recientesResult = await pool.request().query(`
        SELECT TOP 5
            s.id, s.numero_servicio, s.cliente_nombre,
            s.ubicacion_origen, s.estado, s.prioridad,
            c.placa AS camion_placa,
            s.fecha_solicitud
        FROM solicitudes s
        LEFT JOIN camiones c ON s.camion_id = c.id
        ORDER BY s.fecha_solicitud DESC
    `);

    return {
        ...estadosResult.recordset[0],
        solicitudes_hoy: hoyResult.recordset[0].solicitudes_hoy,
        recientes: recientesResult.recordset,
    };
}
