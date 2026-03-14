/**
 * ============================================================================
 * Módulo de API — Comunicación con el Backend
 * ============================================================================
 * 
 * Wrapper centralizado para todas las llamadas HTTP al backend.
 * - Agrega automáticamente el token JWT a las peticiones
 * - Maneja errores de autenticación (redirige al login si el token expira)
 * - Provee funciones tipadas para cada endpoint
 * ============================================================================
 */

import { ApiResponse, LoginResponse, Usuario, UsuarioCompleto, Rol, Camion, TipoGrua, Solicitud, DashboardStats, Mantenimiento, Combustible, Cliente, Notificacion } from '@/types';

/**
 * URL base del backend API.
 * Se resuelve siempre en el navegador usando window.location.hostname
 * para que funcione desde cualquier IP de la red local.
 */
function getApiUrl(): string {
    if (typeof window === 'undefined') return '';
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) return envUrl;
    return 'http://' + window.location.hostname + ':4000';
}

/**
 * Obtiene el token JWT almacenado en localStorage.
 * @returns Token JWT o null si no existe
 */
function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

/**
 * Función base para hacer peticiones HTTP al backend.
 * Automáticamente incluye el token JWT y maneja errores.
 * 
 * @param endpoint - Ruta del endpoint (ej: '/api/camiones')
 * @param options - Opciones de fetch (method, body, etc.)
 * @returns Respuesta parseada como JSON
 */
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = getToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    // Agregar token de autenticación si existe
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getApiUrl()}${endpoint}`, {
        ...options,
        headers,
    });

    // Si el token expiró o es inválido, redirigir al login
    // EXCEPCIÓN: no redirigir si ya estamos en el endpoint de login
    // (un 401 en login significa credenciales inválidas, no sesión expirada)
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
    }

    return response.json();
}

// ============================================================================
// AUTENTICACIÓN
// ============================================================================

/** Iniciar sesión con email y contraseña */
export async function login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return fetchAPI<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

/** Obtener datos del usuario autenticado */
export async function obtenerPerfil(): Promise<ApiResponse<Usuario>> {
    return fetchAPI<Usuario>('/api/auth/me');
}

// ============================================================================
// USUARIOS
// ============================================================================

/** Listar todos los usuarios */
export async function listarUsuarios(): Promise<ApiResponse<UsuarioCompleto[]>> {
    return fetchAPI<UsuarioCompleto[]>('/api/usuarios');
}

/** Obtener un usuario por ID */
export async function obtenerUsuario(id: number): Promise<ApiResponse<UsuarioCompleto>> {
    return fetchAPI<UsuarioCompleto>(`/api/usuarios/${id}`);
}

/** Crear un nuevo usuario */
export async function crearUsuario(datos: { nombre: string; email: string; password: string; rol_id: number }): Promise<ApiResponse<UsuarioCompleto>> {
    return fetchAPI<UsuarioCompleto>('/api/usuarios', {
        method: 'POST',
        body: JSON.stringify(datos),
    });
}

/** Crear un nuevo chofer (Asigna rol Chofer automáticamente) */
export async function crearChoferDirecto(datos: { nombre: string; email: string; password: string }): Promise<ApiResponse<UsuarioCompleto>> {
    return fetchAPI<UsuarioCompleto>('/api/usuarios/choferes', {
        method: 'POST',
        body: JSON.stringify(datos),
    });
}

/** Actualizar un usuario */
export async function actualizarUsuario(id: number, datos: Partial<UsuarioCompleto & { password: string }>): Promise<ApiResponse<UsuarioCompleto>> {
    return fetchAPI<UsuarioCompleto>(`/api/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(datos),
    });
}

/** Desactivar un usuario */
export async function desactivarUsuario(id: number): Promise<ApiResponse<void>> {
    return fetchAPI<void>(`/api/usuarios/${id}`, { method: 'DELETE' });
}

export async function activarUsuario(id: number): Promise<ApiResponse<UsuarioCompleto>> {
    return fetchAPI<UsuarioCompleto>(`/api/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ activo: true }),
    });
}

/** Listar roles disponibles */
export async function listarRoles(): Promise<ApiResponse<Rol[]>> {
    return fetchAPI<Rol[]>('/api/usuarios/roles');
}

// ============================================================================
// CAMIONES (FLOTA)
// ============================================================================

/** Listar todos los camiones */
export async function listarCamiones(): Promise<ApiResponse<Camion[]>> {
    return fetchAPI<Camion[]>('/api/camiones');
}

/** Obtener un camión por ID */
export async function obtenerCamion(id: number): Promise<ApiResponse<Camion>> {
    return fetchAPI<Camion>(`/api/camiones/${id}`);
}

/** Crear un nuevo camión */
export async function crearCamion(datos: Partial<Camion>): Promise<ApiResponse<Camion>> {
    return fetchAPI<Camion>('/api/camiones', {
        method: 'POST',
        body: JSON.stringify(datos),
    });
}

/** Actualizar un camión */
export async function actualizarCamion(id: number, datos: Partial<Camion>): Promise<ApiResponse<Camion>> {
    return fetchAPI<Camion>(`/api/camiones/${id}`, {
        method: 'PUT',
        body: JSON.stringify(datos),
    });
}

/** Listar tipos de grúa */
export async function listarTiposGrua(): Promise<ApiResponse<TipoGrua[]>> {
    return fetchAPI<TipoGrua[]>('/api/camiones/tipos');
}

// ============================================================================
// SOLICITUDES DE SERVICIO
// ============================================================================

/** Listar solicitudes con filtro opcional por estado */
export async function listarSolicitudes(estado?: string): Promise<ApiResponse<Solicitud[]>> {
    const query = estado && estado !== 'Todas' ? `?estado=${encodeURIComponent(estado)}` : '';
    return fetchAPI<Solicitud[]>(`/api/solicitudes${query}`);
}

/** Obtener una solicitud por ID */
export async function obtenerSolicitud(id: number): Promise<ApiResponse<Solicitud>> {
    return fetchAPI<Solicitud>(`/api/solicitudes/${id}`);
}

/** Crear nueva solicitud de servicio */
export async function crearSolicitud(datos: Partial<Solicitud>): Promise<ApiResponse<Solicitud>> {
    return fetchAPI<Solicitud>('/api/solicitudes', {
        method: 'POST',
        body: JSON.stringify(datos),
    });
}

/** Editar datos de una solicitud */
export async function actualizarSolicitud(id: number, datos: Partial<Solicitud>): Promise<ApiResponse<Solicitud>> {
    return fetchAPI<Solicitud>(`/api/solicitudes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(datos),
    });
}

/** Eliminar una solicitud (solo Administrador) */
export async function eliminarSolicitud(id: number): Promise<ApiResponse<void>> {
    return fetchAPI<void>(`/api/solicitudes/${id}`, { method: 'DELETE' });
}

/** Asignar grúa a una solicitud */
export async function asignarGrua(solicitudId: number, camion_id: number, chofer_id: number): Promise<ApiResponse<Solicitud>> {
    return fetchAPI<Solicitud>(`/api/solicitudes/${solicitudId}/asignar`, {
        method: 'PUT',
        body: JSON.stringify({ camion_id, chofer_id }),
    });
}

/** Reasignar grua y chofer a una solicitud activa */
export async function reasignarGrua(solicitudId: number, camion_id: number, chofer_id: number): Promise<ApiResponse<Solicitud>> {
    return fetchAPI<Solicitud>(`/api/solicitudes/${solicitudId}/reasignar`, {
        method: 'PUT',
        body: JSON.stringify({ camion_id, chofer_id }),
    });
}

/** Listar servicios asignados al chofer actual */
export async function listarMisServicios(): Promise<ApiResponse<Solicitud[]>> {
    return fetchAPI<Solicitud[]>('/api/solicitudes/mis-servicios');
}

/** Listar solicitudes del cliente actual */
export async function listarMisSolicitudes(): Promise<ApiResponse<Solicitud[]>> {
    return fetchAPI<Solicitud[]>('/api/solicitudes/mis-solicitudes');
}

/** Actualizar estado de una solicitud (para choferes) */
export async function actualizarEstadoSolicitud(id: number, estado: string): Promise<ApiResponse<Solicitud>> {
    return fetchAPI<Solicitud>(`/api/solicitudes/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado }),
    });
}

// ============================================================================
// CLIENTES
// ============================================================================

/** Listar todos los clientes */
export async function listarClientes(): Promise<ApiResponse<Cliente[]>> {
    return fetchAPI<Cliente[]>('/api/clientes');
}

/** Obtener un cliente por ID */
export async function obtenerCliente(id: number): Promise<ApiResponse<Cliente>> {
    return fetchAPI<Cliente>(`/api/clientes/${id}`);
}

/** Crear un nuevo cliente */
export async function crearCliente(datos: {
    cedula: string; nombre: string; apellido: string;
    telefono?: string; correo?: string; notas?: string;
    crear_usuario?: boolean; password?: string;
}): Promise<ApiResponse<Cliente>> {
    return fetchAPI<Cliente>('/api/clientes', {
        method: 'POST',
        body: JSON.stringify(datos),
    });
}

/** Actualizar un cliente */
export async function actualizarCliente(id: number, datos: Partial<Cliente>): Promise<ApiResponse<Cliente>> {
    return fetchAPI<Cliente>(`/api/clientes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(datos),
    });
}

/** Desactivar un cliente */
export async function desactivarCliente(id: number): Promise<ApiResponse<void>> {
    return fetchAPI<void>(`/api/clientes/${id}`, { method: 'DELETE' });
}

/** Activar un cliente */
export async function activarCliente(id: number): Promise<ApiResponse<Cliente>> {
    return fetchAPI<Cliente>(`/api/clientes/${id}/activar`, { method: 'PUT' });
}

/** Obtener historial de solicitudes de un cliente */
export async function obtenerHistorialCliente(id: number): Promise<ApiResponse<Solicitud[]>> {
    return fetchAPI<Solicitud[]>(`/api/clientes/${id}/historial`);
}

// ============================================================================
// DASHBOARD
// ============================================================================

/** Obtener estadísticas para el dashboard */
export async function obtenerEstadisticas(): Promise<ApiResponse<DashboardStats>> {
    return fetchAPI<DashboardStats>('/api/dashboard/stats');
}

// ============================================================================
// MANTENIMIENTOS
// ============================================================================

/** Listar mantenimientos (opcionalmente por camion) */
export async function listarMantenimientos(camionId?: number): Promise<ApiResponse<Mantenimiento[]>> {
    const query = camionId ? `?camion_id=${camionId}` : '';
    return fetchAPI<Mantenimiento[]>(`/api/mantenimientos${query}`);
}

/** Crear un nuevo mantenimiento */
export async function crearMantenimiento(datos: Partial<Mantenimiento>): Promise<ApiResponse<Mantenimiento>> {
    return fetchAPI<Mantenimiento>('/api/mantenimientos', {
        method: 'POST',
        body: JSON.stringify(datos),
    });
}

/** Actualizar un mantenimiento */
export async function actualizarMantenimiento(id: number, datos: Partial<Mantenimiento>): Promise<ApiResponse<Mantenimiento>> {
    return fetchAPI<Mantenimiento>(`/api/mantenimientos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(datos),
    });
}

/** Completar un mantenimiento (liberar grua) */
export async function completarMantenimiento(id: number): Promise<ApiResponse<Mantenimiento>> {
    return fetchAPI<Mantenimiento>(`/api/mantenimientos/${id}/completar`, { method: 'PUT' });
}

/** Eliminar un mantenimiento */
export async function eliminarMantenimiento(id: number): Promise<ApiResponse<void>> {
    return fetchAPI<void>(`/api/mantenimientos/${id}`, { method: 'DELETE' });
}

// ============================================================================
// COMBUSTIBLE
// ============================================================================

/** Listar registros de combustible (opcionalmente por camion) */
export async function listarCombustible(camionId?: number): Promise<ApiResponse<Combustible[]>> {
    const query = camionId ? `?camion_id=${camionId}` : '';
    return fetchAPI<Combustible[]>(`/api/combustible${query}`);
}

/** Registrar una carga de combustible */
export async function crearCombustible(datos: Partial<Combustible>): Promise<ApiResponse<Combustible>> {
    return fetchAPI<Combustible>('/api/combustible', {
        method: 'POST',
        body: JSON.stringify(datos),
    });
}

/** Eliminar un registro de combustible */
export async function eliminarCombustible(id: number): Promise<ApiResponse<void>> {
    return fetchAPI<void>(`/api/combustible/${id}`, { method: 'DELETE' });
}

// ============================================================================
// NOTIFICACIONES
// ============================================================================

/** Listar notificaciones del usuario actual */
export async function listarNotificaciones(): Promise<ApiResponse<Notificacion[]>> {
    return fetchAPI<Notificacion[]>('/api/notificaciones');
}

/** Contar notificaciones no leidas */
export async function contarNotificacionesNoLeidas(): Promise<ApiResponse<{ total: number }>> {
    return fetchAPI<{ total: number }>('/api/notificaciones/no-leidas');
}

/** Marcar una notificacion como leida */
export async function marcarNotificacionLeida(id: number): Promise<ApiResponse<void>> {
    return fetchAPI<void>(`/api/notificaciones/${id}/leer`, { method: 'PUT' });
}

/** Marcar todas las notificaciones como leidas */
export async function marcarTodasNotificacionesLeidas(): Promise<ApiResponse<void>> {
    return fetchAPI<void>('/api/notificaciones/leer-todas', { method: 'PUT' });
}

/** Eliminar una notificacion */
export async function eliminarNotificacion(id: number): Promise<ApiResponse<void>> {
    return fetchAPI<void>(`/api/notificaciones/${id}`, { method: 'DELETE' });
}

/** Limpiar (eliminar) todas las notificaciones del usuario */
export async function limpiarNotificaciones(): Promise<ApiResponse<void>> {
    return fetchAPI<void>('/api/notificaciones/limpiar', { method: 'DELETE' });
}
