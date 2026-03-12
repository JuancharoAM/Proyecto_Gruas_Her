/**
 * ============================================================================
 * Servicio de Camiones (Flota)
 * ============================================================================
 * 
 * Lógica de negocio para la gestión de la flota de camiones/grúas.
 * Incluye: listar, crear, editar, obtener detalle y cambiar estado.
 * También proporciona estadísticas de la flota para el dashboard.
 * ============================================================================
 */

import { getPool } from '../config/database';

/** Interfaz que define la estructura de un camión en la respuesta */
export interface Camion {
    id: number;
    placa: string;
    marca: string;
    modelo: string;
    anio: number;
    color: string;
    numero_vin: string;
    tipo_grua_id: number;
    tipo_grua_nombre: string;
    estado: string;
    kilometraje: number;
    capacidad_toneladas: number;
    chofer_asignado_id: number | null;
    chofer_nombre: string | null;
    fecha_registro: Date;
    notas: string;
}

/** Datos requeridos para registrar un nuevo camión */
export interface CrearCamionDTO {
    placa: string;
    marca?: string;
    modelo?: string;
    anio?: number;
    color?: string;
    numero_vin?: string;
    tipo_grua_id: number;
    kilometraje?: number;
    capacidad_toneladas?: number;
    chofer_asignado_id?: number;
    notas?: string;
}

/** Datos permitidos para actualizar un camión */
export interface ActualizarCamionDTO {
    placa?: string;
    marca?: string;
    modelo?: string;
    anio?: number;
    color?: string;
    numero_vin?: string;
    tipo_grua_id?: number;
    estado?: string;
    kilometraje?: number;
    capacidad_toneladas?: number;
    chofer_asignado_id?: number | null;
    notas?: string;
}

/**
 * Obtiene la lista completa de camiones de la flota.
 * Incluye el nombre del tipo de grúa y el nombre del chofer asignado.
 * 
 * @returns Array de camiones con datos completos
 */
export async function listarCamiones(): Promise<Camion[]> {
    const pool = await getPool();

    const result = await pool.request().query(`
        SELECT 
            c.id, c.placa, c.marca, c.modelo, c.anio, c.color,
            c.numero_vin, c.tipo_grua_id,
            tg.nombre AS tipo_grua_nombre,
            c.estado, c.kilometraje, c.capacidad_toneladas,
            c.chofer_asignado_id,
            u.nombre AS chofer_nombre,
            c.fecha_registro, c.notas
        FROM camiones c
        LEFT JOIN tipos_grua tg ON c.tipo_grua_id = tg.id
        LEFT JOIN usuarios u ON c.chofer_asignado_id = u.id
        ORDER BY c.placa ASC
    `);

    return result.recordset;
}

/**
 * Obtiene los datos completos de un camión por su ID.
 * 
 * @param id - ID del camión a buscar
 * @returns Datos del camión o null si no existe
 */
export async function obtenerCamionPorId(id: number): Promise<Camion | null> {
    const pool = await getPool();

    const result = await pool.request()
        .input('id', id)
        .query(`
            SELECT 
                c.id, c.placa, c.marca, c.modelo, c.anio, c.color,
                c.numero_vin, c.tipo_grua_id,
                tg.nombre AS tipo_grua_nombre,
                c.estado, c.kilometraje, c.capacidad_toneladas,
                c.chofer_asignado_id,
                u.nombre AS chofer_nombre,
                c.fecha_registro, c.notas
            FROM camiones c
            LEFT JOIN tipos_grua tg ON c.tipo_grua_id = tg.id
            LEFT JOIN usuarios u ON c.chofer_asignado_id = u.id
            WHERE c.id = @id
        `);

    return result.recordset.length > 0 ? result.recordset[0] : null;
}

/**
 * Registra un nuevo camión en la flota.
 * 
 * @param datos - Datos del nuevo camión (placa es obligatorio y único)
 * @returns El camión recién creado
 * @throws Error si la placa ya está registrada
 */
export async function crearCamion(datos: CrearCamionDTO): Promise<Camion> {
    const pool = await getPool();

    // Verificar que la placa no esté duplicada
    const existe = await pool.request()
        .input('placa', datos.placa)
        .query('SELECT id FROM camiones WHERE placa = @placa');

    if (existe.recordset.length > 0) {
        throw new Error('Ya existe un camión con esa placa registrada.');
    }

    // Verificar que el chofer no esté asignado a otro camión
    if (datos.chofer_asignado_id) {
        const choferOcupado = await pool.request()
            .input('chofer_check', datos.chofer_asignado_id)
            .query('SELECT id, placa FROM camiones WHERE chofer_asignado_id = @chofer_check');

        if (choferOcupado.recordset.length > 0) {
            throw new Error(`El chofer ya está asignado al camión ${choferOcupado.recordset[0].placa}. Desasígnelo primero.`);
        }
    }

    // Insertar el nuevo camión
    const result = await pool.request()
        .input('placa', datos.placa)
        .input('marca', datos.marca || null)
        .input('modelo', datos.modelo || null)
        .input('anio', datos.anio || null)
        .input('color', datos.color || null)
        .input('numero_vin', datos.numero_vin || null)
        .input('tipo_grua_id', datos.tipo_grua_id)
        .input('kilometraje', datos.kilometraje || 0)
        .input('capacidad_toneladas', datos.capacidad_toneladas || null)
        .input('chofer_asignado_id', datos.chofer_asignado_id || null)
        .input('notas', datos.notas || null)
        .query(`
            INSERT INTO camiones 
                (placa, marca, modelo, anio, color, numero_vin, tipo_grua_id, 
                 kilometraje, capacidad_toneladas, chofer_asignado_id, notas)
            OUTPUT INSERTED.id
            VALUES 
                (@placa, @marca, @modelo, @anio, @color, @numero_vin, @tipo_grua_id,
                 @kilometraje, @capacidad_toneladas, @chofer_asignado_id, @notas)
        `);

    const nuevoId = result.recordset[0].id;
    return (await obtenerCamionPorId(nuevoId))!;
}

/**
 * Actualiza los datos de un camión existente.
 * Solo modifica los campos que se proporcionan en el DTO.
 * 
 * @param id - ID del camión a actualizar
 * @param datos - Campos a actualizar
 * @returns El camión actualizado o null si no existe
 */
export async function actualizarCamion(id: number, datos: ActualizarCamionDTO): Promise<Camion | null> {
    const pool = await getPool();

    // Verificar que el chofer no esté asignado a otro camión
    if (datos.chofer_asignado_id !== undefined && datos.chofer_asignado_id !== null) {
        const choferOcupado = await pool.request()
            .input('chofer_check', datos.chofer_asignado_id)
            .input('camion_id', id)
            .query('SELECT id, placa FROM camiones WHERE chofer_asignado_id = @chofer_check AND id != @camion_id');

        if (choferOcupado.recordset.length > 0) {
            throw new Error(`El chofer ya está asignado al camión ${choferOcupado.recordset[0].placa}. Desasígnelo primero.`);
        }
    }

    // Construir la consulta dinámicamente
    const campos: string[] = [];
    const request = pool.request().input('id', id);

    if (datos.placa !== undefined) { campos.push('placa = @placa'); request.input('placa', datos.placa); }
    if (datos.marca !== undefined) { campos.push('marca = @marca'); request.input('marca', datos.marca); }
    if (datos.modelo !== undefined) { campos.push('modelo = @modelo'); request.input('modelo', datos.modelo); }
    if (datos.anio !== undefined) { campos.push('anio = @anio'); request.input('anio', datos.anio); }
    if (datos.color !== undefined) { campos.push('color = @color'); request.input('color', datos.color); }
    if (datos.numero_vin !== undefined) { campos.push('numero_vin = @numero_vin'); request.input('numero_vin', datos.numero_vin); }
    if (datos.tipo_grua_id !== undefined) { campos.push('tipo_grua_id = @tipo_grua_id'); request.input('tipo_grua_id', datos.tipo_grua_id); }
    if (datos.estado !== undefined) { campos.push('estado = @estado'); request.input('estado', datos.estado); }
    if (datos.kilometraje !== undefined) { campos.push('kilometraje = @kilometraje'); request.input('kilometraje', datos.kilometraje); }
    if (datos.capacidad_toneladas !== undefined) { campos.push('capacidad_toneladas = @cap'); request.input('cap', datos.capacidad_toneladas); }
    if (datos.chofer_asignado_id !== undefined) { campos.push('chofer_asignado_id = @chofer'); request.input('chofer', datos.chofer_asignado_id); }
    if (datos.notas !== undefined) { campos.push('notas = @notas'); request.input('notas', datos.notas); }

    if (campos.length === 0) {
        return obtenerCamionPorId(id);
    }

    await request.query(`UPDATE camiones SET ${campos.join(', ')} WHERE id = @id`);
    return obtenerCamionPorId(id);
}

/**
 * Obtiene los tipos de grúa disponibles.
 * Se usa para los selectores en formularios de camiones.
 * 
 * @returns Array de tipos de grúa
 */
export async function listarTiposGrua() {
    const pool = await getPool();

    const result = await pool.request().query(`
        SELECT id, nombre, descripcion 
        FROM tipos_grua 
        WHERE activo = 1 
        ORDER BY nombre ASC
    `);

    return result.recordset;
}

/**
 * Obtiene estadísticas de la flota para el dashboard.
 * Retorna conteos por estado y por tipo de grúa.
 * 
 * @returns Objeto con estadísticas de la flota
 */
export async function obtenerEstadisticasFlota() {
    const pool = await getPool();

    // Conteo total y por estado
    const estadosResult = await pool.request().query(`
        SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN estado = 'Disponible' THEN 1 ELSE 0 END) AS disponibles,
            SUM(CASE WHEN estado = 'En servicio' THEN 1 ELSE 0 END) AS en_servicio,
            SUM(CASE WHEN estado = 'Mantenimiento' THEN 1 ELSE 0 END) AS en_mantenimiento,
            SUM(CASE WHEN estado = 'Fuera de servicio' THEN 1 ELSE 0 END) AS fuera_servicio
        FROM camiones
    `);

    // Conteo por tipo de grúa
    const tiposResult = await pool.request().query(`
        SELECT 
            tg.nombre AS tipo,
            COUNT(c.id) AS cantidad
        FROM tipos_grua tg
        LEFT JOIN camiones c ON tg.id = c.tipo_grua_id
        WHERE tg.activo = 1
        GROUP BY tg.nombre
        ORDER BY cantidad DESC
    `);

    return {
        ...estadosResult.recordset[0],
        por_tipo: tiposResult.recordset,
    };
}
