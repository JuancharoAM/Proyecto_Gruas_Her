import { getPool } from '../config/database';

export interface UbicacionActiva {
    camion_id: number;
    placa: string;
    chofer_nombre: string;
    numero_servicio: string;
    cliente_nombre: string;
    latitud: number;
    longitud: number;
    fecha_reporte: Date;
}

export interface ReportarUbicacionDTO {
    camion_id: number;
    chofer_id: number;
    latitud: number;
    longitud: number;
}

export async function reportarUbicacion(datos: ReportarUbicacionDTO): Promise<void> {
    const pool = await getPool();
    await pool.request()
        .input('camion_id', datos.camion_id)
        .input('chofer_id', datos.chofer_id)
        .input('latitud', datos.latitud)
        .input('longitud', datos.longitud)
        .query(`
            MERGE ubicaciones AS target
            USING (VALUES (@camion_id, @chofer_id, @latitud, @longitud))
                AS source (camion_id, chofer_id, latitud, longitud)
            ON target.camion_id = source.camion_id
            WHEN MATCHED THEN
                UPDATE SET
                    chofer_id     = source.chofer_id,
                    latitud       = source.latitud,
                    longitud      = source.longitud,
                    fecha_reporte = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (camion_id, chofer_id, latitud, longitud)
                VALUES (source.camion_id, source.chofer_id, source.latitud, source.longitud);
        `);
}

export async function listarActivas(): Promise<UbicacionActiva[]> {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT
            u.camion_id,
            c.placa,
            uc.nombre        AS chofer_nombre,
            s.numero_servicio,
            s.cliente_nombre,
            u.latitud,
            u.longitud,
            u.fecha_reporte
        FROM ubicaciones u
        INNER JOIN camiones c ON u.camion_id = c.id
        INNER JOIN usuarios uc ON u.chofer_id = uc.id
        INNER JOIN (
            SELECT
                camion_id,
                numero_servicio,
                cliente_nombre,
                ROW_NUMBER() OVER (PARTITION BY camion_id ORDER BY fecha_solicitud DESC) AS rn
            FROM solicitudes
            WHERE estado IN ('Asignada', 'En camino', 'Atendiendo')
              AND camion_id IS NOT NULL
        ) s ON s.camion_id = u.camion_id AND s.rn = 1
    `);
    return result.recordset;
}
