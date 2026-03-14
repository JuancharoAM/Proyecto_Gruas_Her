/**
 * ============================================================================
 * Tipos TypeScript — Interfaces del Sistema
 * ============================================================================
 * 
 * Define las interfaces TypeScript utilizadas en todo el frontend.
 * Estas interfaces deben coincidir con las respuestas del backend API.
 * ============================================================================
 */

/** Datos del usuario autenticado */
export interface Usuario {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    rolId: number;
}

/** Respuesta del endpoint de login */
export interface LoginResponse {
    token: string;
    usuario: Usuario;
}

/** Datos completos de un usuario (para gestión admin) */
export interface UsuarioCompleto {
    id: number;
    nombre: string;
    email: string;
    rol_id: number;
    rol_nombre: string;
    activo: boolean;
    fecha_creacion: string;
    ultimo_acceso: string | null;
}

/** Rol del sistema */
export interface Rol {
    id: number;
    nombre: string;
    descripcion: string;
}

/** Tipo de grúa */
export interface TipoGrua {
    id: number;
    nombre: string;
    descripcion: string;
}

/** Camión/Grúa de la flota */
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
    fecha_registro: string;
    notas: string;
}

/** Solicitud de servicio de grúa */
export interface Solicitud {
    id: number;
    numero_servicio: string;
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
    fecha_solicitud: string;
    fecha_asignacion: string | null;
    fecha_inicio_servicio: string | null;
    fecha_finalizacion: string | null;
    creado_por: number;
    creador_nombre: string;
    notas_internas: string;
}

/** Estadísticas del dashboard */
export interface DashboardStats {
    solicitudes: {
        total: number;
        pendientes: number;
        asignadas: number;
        en_camino: number;
        atendiendo: number;
        finalizadas: number;
        canceladas: number;
        solicitudes_hoy: number;
        recientes: Array<{
            id: number;
            numero_servicio: string;
            cliente_nombre: string;
            ubicacion_origen: string;
            estado: string;
            prioridad: string;
            camion_placa: string | null;
            fecha_solicitud: string;
        }>;
    };
    flota: {
        total: number;
        disponibles: number;
        en_servicio: number;
        en_mantenimiento: number;
        fuera_servicio: number;
        por_tipo: Array<{ tipo: string; cantidad: number }>;
    };
}

/** Registro de mantenimiento */
export interface Mantenimiento {
    id: number;
    camion_id: number;
    camion_placa: string;
    tipo: string;
    estado: string;
    descripcion: string;
    fecha_mantenimiento: string;
    fecha_completado: string | null;
    costo: number;
    kilometraje_actual: number;
    fecha_proximo: string | null;
    realizado_por: number;
    realizado_por_nombre: string;
    notas: string;
}

/** Registro de carga de combustible */
export interface Combustible {
    id: number;
    camion_id: number;
    camion_placa: string;
    fecha: string;
    litros: number;
    costo: number;
    kilometraje: number;
    estacion: string;
    registrado_por: number;
    registrado_por_nombre: string;
}

/** Cliente registrado */
export interface Cliente {
    id: number;
    cedula: string;
    nombre: string;
    apellido: string;
    telefono: string;
    correo: string;
    activo: boolean;
    fecha_registro: string;
    usuario_id: number | null;
    usuario_email: string | null;
    notas: string;
    total_solicitudes: number;
}

/** Notificacion del sistema */
export interface Notificacion {
    id: number;
    usuario_id: number;
    titulo: string;
    mensaje: string;
    tipo: string;
    leida: boolean;
    referencia_tipo: string | null;
    referencia_id: number | null;
    fecha_creacion: string;
}

/** Respuesta genérica de la API */
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}
