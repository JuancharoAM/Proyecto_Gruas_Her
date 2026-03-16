/**
 * ============================================================================
 * Servicio de Reportes
 * ============================================================================
 * Genera datos agregados para reportes operativos y administrativos.
 * Cada reporte retorna datos listos para visualizacion y exportacion.
 * ============================================================================
 */

import { getPool } from '../config/database';

// ======================== Interfaces ========================

export interface ReporteSolicitudes {
    resumen: {
        total: number;
        pendientes: number;
        asignadas: number;
        en_camino: number;
        atendiendo: number;
        finalizadas: number;
        canceladas: number;
        tasa_finalizacion: number;
    };
    por_mes: { mes: string; total: number; finalizadas: number; canceladas: number }[];
    por_tipo_servicio: { tipo: string; cantidad: number }[];
    por_prioridad: { prioridad: string; cantidad: number }[];
    recientes: { numero_servicio: string; cliente_nombre: string; estado: string; prioridad: string; fecha_solicitud: string; camion_placa: string | null; chofer_nombre: string | null }[];
}

export interface ReporteFlota {
    resumen: {
        total: number;
        disponibles: number;
        en_servicio: number;
        en_mantenimiento: number;
        fuera_servicio: number;
    };
    por_tipo: { tipo: string; cantidad: number; disponibles: number }[];
    por_estado: { estado: string; cantidad: number }[];
    mantenimientos_recientes: { camion_placa: string; tipo: string; estado: string; descripcion: string; costo: number; fecha: string }[];
    combustible_por_camion: { camion_placa: string; marca: string; modelo: string; total_litros: number; total_costo: number; cargas: number }[];
}

export interface ReporteOperativo {
    servicios_por_chofer: { chofer_nombre: string; total: number; finalizados: number; cancelados: number; activos: number }[];
    tiempo_promedio_resolucion: { mes: string; promedio_horas: number; total_servicios: number }[];
    solicitudes_por_dia_semana: { dia: string; dia_num: number; cantidad: number }[];
    costos_mantenimiento_mensual: { mes: string; total_costo: number; cantidad: number }[];
    costos_combustible_mensual: { mes: string; total_litros: number; total_costo: number; cargas: number }[];
}

// ======================== Reporte de Solicitudes ========================

export async function reporteSolicitudes(fechaDesde?: string, fechaHasta?: string): Promise<ReporteSolicitudes> {
    const pool = await getPool();
    let filtroFecha = '';
    if (fechaDesde) filtroFecha += ` AND s.fecha_solicitud >= '${fechaDesde}'`;
    if (fechaHasta) filtroFecha += ` AND s.fecha_solicitud <= '${fechaHasta} 23:59:59'`;

    // Resumen general
    const resumenResult = await pool.request().query(`
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN s.estado = 'Pendiente' THEN 1 ELSE 0 END) AS pendientes,
            SUM(CASE WHEN s.estado = 'Asignada' THEN 1 ELSE 0 END) AS asignadas,
            SUM(CASE WHEN s.estado = 'En camino' THEN 1 ELSE 0 END) AS en_camino,
            SUM(CASE WHEN s.estado = 'Atendiendo' THEN 1 ELSE 0 END) AS atendiendo,
            SUM(CASE WHEN s.estado = 'Finalizada' THEN 1 ELSE 0 END) AS finalizadas,
            SUM(CASE WHEN s.estado = 'Cancelada' THEN 1 ELSE 0 END) AS canceladas
        FROM solicitudes s WHERE 1=1 ${filtroFecha}
    `);
    const r = resumenResult.recordset[0];
    const tasa = r.total > 0 ? Math.round((r.finalizadas / r.total) * 100) : 0;

    // Por mes (ultimos 6 meses)
    const porMesResult = await pool.request().query(`
        SELECT
            FORMAT(s.fecha_solicitud, 'yyyy-MM') AS mes,
            COUNT(*) AS total,
            SUM(CASE WHEN s.estado = 'Finalizada' THEN 1 ELSE 0 END) AS finalizadas,
            SUM(CASE WHEN s.estado = 'Cancelada' THEN 1 ELSE 0 END) AS canceladas
        FROM solicitudes s
        WHERE s.fecha_solicitud >= DATEADD(MONTH, -6, GETDATE()) ${filtroFecha}
        GROUP BY FORMAT(s.fecha_solicitud, 'yyyy-MM')
        ORDER BY mes
    `);

    // Por tipo de servicio
    const porTipoResult = await pool.request().query(`
        SELECT ISNULL(s.tipo_servicio, 'Estándar') AS tipo, COUNT(*) AS cantidad
        FROM solicitudes s WHERE 1=1 ${filtroFecha}
        GROUP BY s.tipo_servicio ORDER BY cantidad DESC
    `);

    // Por prioridad
    const porPrioridadResult = await pool.request().query(`
        SELECT ISNULL(s.prioridad, 'Normal') AS prioridad, COUNT(*) AS cantidad
        FROM solicitudes s WHERE 1=1 ${filtroFecha}
        GROUP BY s.prioridad ORDER BY cantidad DESC
    `);

    // Ultimas 20 solicitudes
    const recientesResult = await pool.request().query(`
        SELECT TOP 20 s.numero_servicio, s.cliente_nombre, s.estado, s.prioridad,
               s.fecha_solicitud, c.placa AS camion_placa, u.nombre AS chofer_nombre
        FROM solicitudes s
        LEFT JOIN camiones c ON s.camion_id = c.id
        LEFT JOIN usuarios u ON s.chofer_id = u.id
        WHERE 1=1 ${filtroFecha}
        ORDER BY s.fecha_solicitud DESC
    `);

    return {
        resumen: { ...r, tasa_finalizacion: tasa },
        por_mes: porMesResult.recordset,
        por_tipo_servicio: porTipoResult.recordset,
        por_prioridad: porPrioridadResult.recordset,
        recientes: recientesResult.recordset,
    };
}

// ======================== Reporte de Flota ========================

export async function reporteFlota(): Promise<ReporteFlota> {
    const pool = await getPool();

    // Resumen
    const resumenResult = await pool.request().query(`
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN estado = 'Disponible' THEN 1 ELSE 0 END) AS disponibles,
            SUM(CASE WHEN estado = 'En servicio' THEN 1 ELSE 0 END) AS en_servicio,
            SUM(CASE WHEN estado = 'Mantenimiento' THEN 1 ELSE 0 END) AS en_mantenimiento,
            SUM(CASE WHEN estado = 'Fuera de servicio' THEN 1 ELSE 0 END) AS fuera_servicio
        FROM camiones
    `);

    // Por tipo
    const porTipoResult = await pool.request().query(`
        SELECT tg.nombre AS tipo, COUNT(c.id) AS cantidad,
               SUM(CASE WHEN c.estado = 'Disponible' THEN 1 ELSE 0 END) AS disponibles
        FROM camiones c
        INNER JOIN tipos_grua tg ON c.tipo_grua_id = tg.id
        GROUP BY tg.nombre ORDER BY cantidad DESC
    `);

    // Por estado
    const porEstadoResult = await pool.request().query(`
        SELECT estado, COUNT(*) AS cantidad FROM camiones GROUP BY estado ORDER BY cantidad DESC
    `);

    // Mantenimientos recientes
    const mantResult = await pool.request().query(`
        SELECT TOP 15 c.placa AS camion_placa, m.tipo, m.estado, m.descripcion,
               ISNULL(m.costo, 0) AS costo, m.fecha_mantenimiento AS fecha
        FROM mantenimientos m
        INNER JOIN camiones c ON m.camion_id = c.id
        ORDER BY m.fecha_mantenimiento DESC
    `);

    // Combustible por camion
    const combResult = await pool.request().query(`
        SELECT c.placa AS camion_placa, c.marca, c.modelo,
               ISNULL(SUM(cb.litros), 0) AS total_litros,
               ISNULL(SUM(cb.costo), 0) AS total_costo,
               COUNT(cb.id) AS cargas
        FROM camiones c
        LEFT JOIN combustible cb ON c.id = cb.camion_id
        GROUP BY c.placa, c.marca, c.modelo
        HAVING COUNT(cb.id) > 0
        ORDER BY total_costo DESC
    `);

    return {
        resumen: resumenResult.recordset[0],
        por_tipo: porTipoResult.recordset,
        por_estado: porEstadoResult.recordset,
        mantenimientos_recientes: mantResult.recordset,
        combustible_por_camion: combResult.recordset,
    };
}

// ======================== Reporte Operativo ========================

export async function reporteOperativo(): Promise<ReporteOperativo> {
    const pool = await getPool();

    // Servicios por chofer
    const porChoferResult = await pool.request().query(`
        SELECT u.nombre AS chofer_nombre,
               COUNT(s.id) AS total,
               SUM(CASE WHEN s.estado = 'Finalizada' THEN 1 ELSE 0 END) AS finalizados,
               SUM(CASE WHEN s.estado = 'Cancelada' THEN 1 ELSE 0 END) AS cancelados,
               SUM(CASE WHEN s.estado IN ('Asignada', 'En camino', 'Atendiendo') THEN 1 ELSE 0 END) AS activos
        FROM solicitudes s
        INNER JOIN usuarios u ON s.chofer_id = u.id
        GROUP BY u.nombre
        ORDER BY total DESC
    `);

    // Tiempo promedio de resolucion por mes (solo finalizadas)
    const tiempoResult = await pool.request().query(`
        SELECT FORMAT(fecha_solicitud, 'yyyy-MM') AS mes,
               AVG(DATEDIFF(HOUR, fecha_solicitud, fecha_finalizacion)) AS promedio_horas,
               COUNT(*) AS total_servicios
        FROM solicitudes
        WHERE estado = 'Finalizada' AND fecha_finalizacion IS NOT NULL
              AND fecha_solicitud >= DATEADD(MONTH, -6, GETDATE())
        GROUP BY FORMAT(fecha_solicitud, 'yyyy-MM')
        ORDER BY mes
    `);

    // Solicitudes por dia de la semana
    const porDiaResult = await pool.request().query(`
        SELECT
            CASE DATEPART(WEEKDAY, fecha_solicitud)
                WHEN 1 THEN 'Domingo' WHEN 2 THEN 'Lunes' WHEN 3 THEN 'Martes'
                WHEN 4 THEN 'Miércoles' WHEN 5 THEN 'Jueves' WHEN 6 THEN 'Viernes'
                WHEN 7 THEN 'Sábado'
            END AS dia,
            DATEPART(WEEKDAY, fecha_solicitud) AS dia_num,
            COUNT(*) AS cantidad
        FROM solicitudes
        GROUP BY DATEPART(WEEKDAY, fecha_solicitud)
        ORDER BY dia_num
    `);

    // Costos de mantenimiento por mes
    const costoMantResult = await pool.request().query(`
        SELECT FORMAT(fecha_mantenimiento, 'yyyy-MM') AS mes,
               ISNULL(SUM(costo), 0) AS total_costo,
               COUNT(*) AS cantidad
        FROM mantenimientos
        WHERE fecha_mantenimiento >= DATEADD(MONTH, -6, GETDATE())
        GROUP BY FORMAT(fecha_mantenimiento, 'yyyy-MM')
        ORDER BY mes
    `);

    // Costos de combustible por mes
    const costoCombResult = await pool.request().query(`
        SELECT FORMAT(fecha, 'yyyy-MM') AS mes,
               ISNULL(SUM(litros), 0) AS total_litros,
               ISNULL(SUM(costo), 0) AS total_costo,
               COUNT(*) AS cargas
        FROM combustible
        WHERE fecha >= DATEADD(MONTH, -6, GETDATE())
        GROUP BY FORMAT(fecha, 'yyyy-MM')
        ORDER BY mes
    `);

    return {
        servicios_por_chofer: porChoferResult.recordset,
        tiempo_promedio_resolucion: tiempoResult.recordset,
        solicitudes_por_dia_semana: porDiaResult.recordset,
        costos_mantenimiento_mensual: costoMantResult.recordset,
        costos_combustible_mensual: costoCombResult.recordset,
    };
}
