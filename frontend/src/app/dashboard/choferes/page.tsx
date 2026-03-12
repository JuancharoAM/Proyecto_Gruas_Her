"use client";

/**
 * ============================================================================
 * Página de Gestión de Choferes (Administrador/Logística)
 * ============================================================================
 * Sistema completo de administración de choferes con dos vistas principales:
 *   - Tab "Choferes": Tabla CRUD con búsqueda, crear/editar/activar-desactivar
 *   - Tab "Servicios Activos": Panel dividido para gestionar servicios por chofer
 *     con filtros de estado y acciones de sobrescritura administrativa
 * ============================================================================
 */

import { useEffect, useState, useMemo } from "react";
import { UsuarioCompleto, Solicitud, Camion } from "@/types";
import {
    listarUsuarios,
    listarSolicitudes,
    listarCamiones,
    crearChoferDirecto,
    actualizarUsuario,
    actualizarCamion,
    desactivarUsuario,
    activarUsuario,
    actualizarEstadoSolicitud,
} from "@/lib/api";
import Icon from "@/components/Icon";

/** Pestanas disponibles en la pagina */
type TabActiva = "choferes" | "servicios";

/** Filtro de estado para la vista de servicios */
type FiltroServicio = "activos" | "todos" | "finalizados";

/**
 * Formatea una fecha ISO a formato legible en espanol de Costa Rica.
 * @param fecha - Cadena de fecha ISO del backend
 * @returns Fecha formateada como "01 ene 2026"
 */
function formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString("es-CR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function ChoferesAdminPage() {
    // ======================== Estado Principal ========================

    const [choferes, setChoferes] = useState<UsuarioCompleto[]>([]);
    const [todasSolicitudes, setTodasSolicitudes] = useState<Solicitud[]>([]);
    const [camiones, setCamiones] = useState<Camion[]>([]);
    const [loading, setLoading] = useState(true);

    // Navegacion por pestanas
    const [tabActiva, setTabActiva] = useState<TabActiva>("choferes");

    // Busqueda en la tabla de choferes
    const [busqueda, setBusqueda] = useState("");

    // Modales
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
    const [choferEditando, setChoferEditando] = useState<UsuarioCompleto | null>(null);

    // Formularios
    const [formCrear, setFormCrear] = useState({ nombre: "", email: "", password: "" });
    const [formEditar, setFormEditar] = useState({ nombre: "", email: "", password: "", camion_asignado_id: "" });

    // Mensajes al usuario
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    // Panel de servicios
    const [selectedChofer, setSelectedChofer] = useState<UsuarioCompleto | null>(null);
    const [filtroServicio, setFiltroServicio] = useState<FiltroServicio>("activos");
    const [submittingId, setSubmittingId] = useState<number | null>(null);

    // ======================== Carga de Datos ========================

    /**
     * Carga en paralelo todos los datos necesarios: usuarios (filtrados a choferes),
     * solicitudes de servicio y camiones de la flota.
     */
    async function cargarDatos() {
        setLoading(true);
        try {
            const [resU, resS, resC] = await Promise.all([
                listarUsuarios(),
                listarSolicitudes(),
                listarCamiones(),
            ]);
            if (resU.success && resU.data) {
                setChoferes(resU.data.filter(u => u.rol_nombre === "Chofer"));
            }
            if (resS.success && resS.data) {
                setTodasSolicitudes(resS.data);
            }
            if (resC.success && resC.data) {
                setCamiones(resC.data);
            }
        } catch {
            setError("Error al cargar datos.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    // ======================== Datos Derivados ========================

    /** Choferes filtrados por la busqueda de texto (nombre o email) */
    const choferesFiltrados = useMemo(() => {
        if (!busqueda.trim()) return choferes;
        const termino = busqueda.toLowerCase();
        return choferes.filter(
            c => c.nombre.toLowerCase().includes(termino) || c.email.toLowerCase().includes(termino)
        );
    }, [choferes, busqueda]);

    /**
     * Mapa de chofer_id a la grua (camion) que tiene asignada.
     * Se construye a partir de la tabla de camiones donde chofer_asignado_id no es null.
     */
    const gruaPorChofer = useMemo(() => {
        const mapa: Record<number, Camion> = {};
        camiones.forEach(c => {
            if (c.chofer_asignado_id !== null) {
                mapa[c.chofer_asignado_id] = c;
            }
        });
        return mapa;
    }, [camiones]);

    /**
     * Cuenta de servicios activos (no finalizados ni cancelados) por chofer.
     */
    const serviciosActivosPorChofer = useMemo(() => {
        const conteo: Record<number, number> = {};
        todasSolicitudes.forEach(s => {
            if (s.chofer_id && s.estado !== "Finalizada" && s.estado !== "Cancelada") {
                conteo[s.chofer_id] = (conteo[s.chofer_id] || 0) + 1;
            }
        });
        return conteo;
    }, [todasSolicitudes]);

    /**
     * Solicitudes del chofer seleccionado en el panel de servicios,
     * filtradas segun el filtro de estado activo.
     */
    const solicitudesDelChofer = useMemo(() => {
        if (!selectedChofer) return [];
        const delChofer = todasSolicitudes.filter(s => s.chofer_id === selectedChofer.id);

        switch (filtroServicio) {
            case "activos":
                return delChofer.filter(s => s.estado !== "Finalizada" && s.estado !== "Cancelada");
            case "finalizados":
                return delChofer.filter(s => s.estado === "Finalizada" || s.estado === "Cancelada");
            case "todos":
            default:
                return delChofer;
        }
    }, [selectedChofer, todasSolicitudes, filtroServicio]);

    // ======================== Utilidades ========================

    /** Mapa de camion_id → nombre del chofer al que está asignado (excluyendo el chofer que se edita) */
    const camionAsignadoA = useMemo(() => {
        const mapa: Record<number, string> = {};
        camiones.forEach(c => {
            if (c.chofer_asignado_id && (!choferEditando || c.chofer_asignado_id !== choferEditando.id)) {
                mapa[c.id] = c.chofer_nombre || "Otro chofer";
            }
        });
        return mapa;
    }, [camiones, choferEditando]);

    /** Muestra un mensaje de exito que se auto-limpia despues de 3 segundos */
    function mostrarMensaje(texto: string) {
        setMensaje(texto);
        setTimeout(() => setMensaje(""), 3000);
    }

    // ======================== Crear Chofer ========================

    /** Abre el modal de creacion con el formulario limpio */
    function abrirCrearChofer() {
        setFormCrear({ nombre: "", email: "", password: "" });
        setError("");
        setModalCrearAbierto(true);
    }

    /**
     * Envia el formulario de creacion al backend.
     * Valida campos requeridos antes de enviar.
     */
    async function handleGuardarNuevo() {
        setError("");
        if (!formCrear.nombre || !formCrear.email || !formCrear.password) {
            setError("Todos los campos marcados con * son requeridos.");
            return;
        }
        try {
            const res = await crearChoferDirecto(formCrear);
            if (res.success) {
                mostrarMensaje("Chofer registrado exitosamente.");
                setModalCrearAbierto(false);
                cargarDatos();
            } else {
                setError(res.message || "Error al registrar chofer.");
            }
        } catch {
            setError("Error de conexión.");
        }
    }

    // ======================== Editar Chofer ========================

    /**
     * Abre el modal de edicion con los datos del chofer seleccionado.
     * El campo password se deja vacio intencionalmente: solo se actualiza
     * si el administrador escribe una nueva contrasena.
     */
    function abrirEditarChofer(chofer: UsuarioCompleto) {
        setChoferEditando(chofer);
        const gruaActual = gruaPorChofer[chofer.id];
        setFormEditar({
            nombre: chofer.nombre,
            email: chofer.email,
            password: "",
            camion_asignado_id: gruaActual?.id.toString() || "",
        });
        setError("");
        setModalEditarAbierto(true);
    }

    /**
     * Envia los datos actualizados al backend.
     * Solo incluye la contrasena en el payload si se proporciono una nueva.
     */
    async function handleGuardarEdicion() {
        if (!choferEditando) return;
        setError("");

        if (!formEditar.nombre || !formEditar.email) {
            setError("El nombre y correo son requeridos.");
            return;
        }

        // Construir payload solo con los campos que se deben actualizar
        const datos: Record<string, string> = {
            nombre: formEditar.nombre,
            email: formEditar.email,
        };

        // Solo enviar la contrasena si el admin escribio algo
        if (formEditar.password.trim()) {
            datos.password = formEditar.password;
        }

        try {
            const res = await actualizarUsuario(choferEditando.id, datos);
            if (!res.success) {
                setError(res.message || "Error al actualizar chofer.");
                return;
            }

            // Manejar cambio de grúa asignada
            const gruaAnterior = gruaPorChofer[choferEditando.id];
            const nuevaGruaId = formEditar.camion_asignado_id ? parseInt(formEditar.camion_asignado_id) : null;
            const gruaAnteriorId = gruaAnterior?.id || null;

            if (nuevaGruaId !== gruaAnteriorId) {
                // Desasignar de la grúa anterior
                if (gruaAnteriorId) {
                    await actualizarCamion(gruaAnteriorId, { chofer_asignado_id: null });
                }
                // Asignar a la nueva grúa
                if (nuevaGruaId) {
                    const resGrua = await actualizarCamion(nuevaGruaId, { chofer_asignado_id: choferEditando.id });
                    if (!resGrua.success) {
                        setError(resGrua.message || "Error al asignar grúa.");
                        cargarDatos();
                        return;
                    }
                }
            }

            mostrarMensaje("Chofer actualizado exitosamente.");
            setModalEditarAbierto(false);
            setChoferEditando(null);
            cargarDatos();
        } catch {
            setError("Error de conexión.");
        }
    }

    // ======================== Activar / Desactivar ========================

    /**
     * Alterna el estado activo/inactivo de un chofer.
     * Solicita confirmacion antes de ejecutar la accion.
     */
    async function handleToggleActivo(chofer: UsuarioCompleto) {
        const accion = chofer.activo ? "desactivar" : "activar";
        if (!confirm(`¿Estás seguro de ${accion} al chofer "${chofer.nombre}"?`)) return;

        try {
            const res = chofer.activo
                ? await desactivarUsuario(chofer.id)
                : await activarUsuario(chofer.id);

            if (res.success) {
                mostrarMensaje(`Chofer ${chofer.activo ? "desactivado" : "activado"} exitosamente.`);
                cargarDatos();
            } else {
                setError(res.message || `Error al ${accion} chofer.`);
            }
        } catch {
            setError("Error de conexión.");
        }
    }

    // ======================== Gestión de Servicios ========================

    /**
     * Cambia a la pestana de servicios y selecciona automaticamente un chofer.
     * Se usa desde el boton "Ver Servicios" en la tabla de choferes.
     */
    function verServiciosDeChofer(chofer: UsuarioCompleto) {
        setSelectedChofer(chofer);
        setFiltroServicio("activos");
        setTabActiva("servicios");
    }

    /**
     * Fuerza el cambio de estado de una solicitud de servicio.
     * Accion administrativa que requiere confirmacion del usuario.
     */
    async function handleActualizarEstado(id: number, nuevoEstado: string) {
        if (!confirm(`¿Estás seguro de forzar el servicio a "${nuevoEstado}"?`)) return;

        setSubmittingId(id);
        try {
            const res = await actualizarEstadoSolicitud(id, nuevoEstado);
            if (res.success && res.data) {
                setTodasSolicitudes(prev => prev.map(s => s.id === id ? res.data! : s));
                mostrarMensaje("Estado de servicio actualizado.");
            } else {
                setError(res.message || "Error al actualizar estado.");
            }
        } catch {
            setError("Ocurrió un error inesperado.");
        } finally {
            setSubmittingId(null);
        }
    }

    // ======================== Render ========================

    return (
        <div className="page-enter">
            {/* Alertas globales */}
            {mensaje && <div className="alert alert-success">{mensaje}</div>}
            {error && !modalCrearAbierto && !modalEditarAbierto && (
                <div className="alert alert-error">{error}</div>
            )}

            {/* Pestanas de navegacion */}
            <div className="tabs mb-2">
                <button
                    className={`tab ${tabActiva === "choferes" ? "tab-active" : ""}`}
                    onClick={() => setTabActiva("choferes")}
                >
                    <Icon name="driver" size={16} /> Choferes
                </button>
                <button
                    className={`tab ${tabActiva === "servicios" ? "tab-active" : ""}`}
                    onClick={() => setTabActiva("servicios")}
                >
                    <Icon name="route" size={16} /> Servicios Activos
                </button>
            </div>

            {/* ============================================================ */}
            {/* TAB: Choferes — Tabla CRUD completa                          */}
            {/* ============================================================ */}
            {tabActiva === "choferes" && (
                <div className="glass-panel" style={{ padding: "20px" }}>
                    {/* Encabezado con titulo, busqueda y boton de registro */}
                    <div className="panel-header">
                        <h3 className="panel-title">Flota de Choferes ({choferes.length})</h3>
                        <div className="flex gap-1 items-center">
                            <div style={{ position: "relative" }}>
                                <span style={{
                                    position: "absolute",
                                    left: "10px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    pointerEvents: "none",
                                    color: "var(--text-muted)",
                                }}>
                                    <Icon name="search" size={16} />
                                </span>
                                <input
                                    className="form-input"
                                    placeholder="Buscar por nombre o correo..."
                                    value={busqueda}
                                    onChange={e => setBusqueda(e.target.value)}
                                    style={{ paddingLeft: "34px", minWidth: "240px" }}
                                />
                            </div>
                            <button className="btn btn-primary" onClick={abrirCrearChofer}>
                                <Icon name="add" size={18} /> Registrar Chofer
                            </button>
                        </div>
                    </div>

                    {/* Contenido de la tabla */}
                    {loading ? (
                        <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">
                            Cargando choferes...
                        </div>
                    ) : choferesFiltrados.length > 0 ? (
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Email</th>
                                        <th>Estado</th>
                                        <th>Grúa Asignada</th>
                                        <th>Servicios Activos</th>
                                        <th>Fecha Registro</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {choferesFiltrados.map(chofer => {
                                        const grua = gruaPorChofer[chofer.id];
                                        const numActivos = serviciosActivosPorChofer[chofer.id] || 0;

                                        return (
                                            <tr key={chofer.id}>
                                                <td style={{ fontWeight: 600 }}>{chofer.nombre}</td>
                                                <td>{chofer.email}</td>
                                                <td>
                                                    <span className={`badge ${chofer.activo ? "badge-success" : "badge-danger"}`}>
                                                        {chofer.activo ? "Activo" : "Inactivo"}
                                                    </span>
                                                </td>
                                                <td>
                                                    {grua ? (
                                                        <span className="flex gap-1 items-center">
                                                            <Icon name="truck" size={14} />
                                                            {grua.placa}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted">Sin asignar</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {numActivos > 0 ? (
                                                        <span className="badge badge-warning">{numActivos}</span>
                                                    ) : (
                                                        <span className="text-muted">0</span>
                                                    )}
                                                </td>
                                                <td>{formatearFecha(chofer.fecha_creacion)}</td>
                                                <td>
                                                    <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => abrirEditarChofer(chofer)}
                                                        >
                                                            <Icon name="edit" size={14} /> Editar
                                                        </button>
                                                        <button
                                                            className={`btn btn-sm ${chofer.activo ? "btn-danger" : "btn-success"}`}
                                                            onClick={() => handleToggleActivo(chofer)}
                                                        >
                                                            {chofer.activo ? "Desactivar" : "Activar"}
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => verServiciosDeChofer(chofer)}
                                                        >
                                                            <Icon name="route" size={14} /> Servicios
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : choferes.length > 0 && choferesFiltrados.length === 0 ? (
                        /* Hay choferes pero la busqueda no coincide con ninguno */
                        <div className="text-center text-muted" style={{ padding: "40px" }}>
                            <Icon name="search" size={40} />
                            <p className="mt-1">No se encontraron choferes que coincidan con "{busqueda}".</p>
                        </div>
                    ) : (
                        /* No hay ningun chofer registrado */
                        <div className="text-center text-muted" style={{ padding: "40px" }}>
                            <Icon name="driver" size={40} />
                            <p className="mt-1">No hay choferes registrados.</p>
                            <button className="btn btn-primary btn-sm mt-2" onClick={abrirCrearChofer}>
                                <Icon name="add" size={16} /> Registrar primero
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================ */}
            {/* TAB: Servicios Activos — Panel dividido                      */}
            {/* ============================================================ */}
            {tabActiva === "servicios" && (
                <div className="flex gap-2" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
                    {/* Panel Izquierdo: Lista de choferes para seleccionar */}
                    <div className="glass-panel" style={{ flex: "1 1 320px", padding: "20px" }}>
                        <div className="panel-header mb-2">
                            <h3 className="panel-title" style={{ margin: 0 }}>Choferes ({choferes.length})</h3>
                        </div>

                        {loading ? (
                            <div className="text-center text-muted mt-2">Cargando...</div>
                        ) : choferes.length === 0 ? (
                            <p className="text-muted text-center mt-2">No hay choferes registrados.</p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {choferes.map(chofer => {
                                    const numActivos = serviciosActivosPorChofer[chofer.id] || 0;
                                    const seleccionado = selectedChofer?.id === chofer.id;

                                    return (
                                        <div
                                            key={chofer.id}
                                            onClick={() => setSelectedChofer(chofer)}
                                            style={{
                                                padding: "14px 16px",
                                                borderRadius: "12px",
                                                border: "1px solid",
                                                borderColor: seleccionado ? "var(--color-primary)" : "var(--border-color)",
                                                background: seleccionado ? "var(--color-primary-subtle)" : "var(--bg-surface)",
                                                cursor: "pointer",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            <div className="flex gap-1 items-center">
                                                <div
                                                    style={{
                                                        width: "36px",
                                                        height: "36px",
                                                        borderRadius: "50%",
                                                        background: "var(--bg-subtle)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        color: "var(--text-muted)",
                                                    }}
                                                >
                                                    <Icon name="driver" size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: "14px" }}>{chofer.nombre}</div>
                                                    <div className="text-muted" style={{ fontSize: "12px" }}>
                                                        {chofer.activo ? (
                                                            <span style={{ color: "var(--color-success)" }}>Activo</span>
                                                        ) : (
                                                            <span style={{ color: "var(--color-danger)" }}>Inactivo</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {numActivos > 0 && (
                                                <span className="badge badge-warning" title="Servicios en curso">
                                                    {numActivos} viaje{numActivos !== 1 ? "s" : ""}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Panel Derecho: Servicios del chofer seleccionado */}
                    <div className="glass-panel" style={{ flex: "2 1 500px", padding: "20px", minHeight: "60vh" }}>
                        {!selectedChofer ? (
                            <div
                                className="text-center text-muted"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%",
                                    paddingTop: "40px",
                                    paddingBottom: "40px",
                                }}
                            >
                                <div style={{ opacity: 0.5, marginBottom: "16px" }}>
                                    <Icon name="route" size={64} />
                                </div>
                                <h3>Gestión de Servicios</h3>
                                <p>Selecciona un chofer de la lista para ver y administrar sus servicios.</p>
                            </div>
                        ) : (
                            <>
                                {/* Encabezado con nombre del chofer y filtros de estado */}
                                <div
                                    className="panel-header mb-2 pb-1"
                                    style={{ borderBottom: "1px solid var(--border-color)" }}
                                >
                                    <h3 className="panel-title" style={{ margin: 0 }}>
                                        Servicios: {selectedChofer.nombre}
                                    </h3>
                                    <div className="flex gap-1">
                                        <button
                                            className={`btn btn-sm ${filtroServicio === "activos" ? "btn-primary" : "btn-ghost"}`}
                                            onClick={() => setFiltroServicio("activos")}
                                        >
                                            Activos
                                        </button>
                                        <button
                                            className={`btn btn-sm ${filtroServicio === "todos" ? "btn-primary" : "btn-ghost"}`}
                                            onClick={() => setFiltroServicio("todos")}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            className={`btn btn-sm ${filtroServicio === "finalizados" ? "btn-primary" : "btn-ghost"}`}
                                            onClick={() => setFiltroServicio("finalizados")}
                                        >
                                            Finalizados
                                        </button>
                                    </div>
                                </div>

                                {/* Lista de servicios */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    {solicitudesDelChofer.length === 0 ? (
                                        <div className="text-center text-muted" style={{ padding: "40px" }}>
                                            <div style={{ marginBottom: "8px" }}><Icon name="check-circle" size={48} /></div>
                                            <p>
                                                {filtroServicio === "activos"
                                                    ? "El chofer no tiene servicios en curso."
                                                    : filtroServicio === "finalizados"
                                                      ? "No hay servicios finalizados para este chofer."
                                                      : "El chofer no tiene servicios registrados."}
                                            </p>
                                        </div>
                                    ) : (
                                        solicitudesDelChofer.map(servicio => (
                                            <ServicioAdminCard
                                                key={servicio.id}
                                                servicio={servicio}
                                                onActualizar={handleActualizarEstado}
                                                isSubmitting={submittingId === servicio.id}
                                            />
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* Modal: Crear Chofer                                          */}
            {/* ============================================================ */}
            {modalCrearAbierto && (
                <div className="modal-overlay" onClick={() => setModalCrearAbierto(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Registrar Nuevo Chofer</h3>
                            <button className="modal-close" onClick={() => setModalCrearAbierto(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>

                        {error && <div className="alert alert-error">{error}</div>}

                        <p className="text-muted" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
                            Crea una cuenta para un chofer. Podrá acceder a su portal móvil de
                            "Mis Servicios" usando estas credenciales.
                        </p>

                        <div className="form-group">
                            <label className="form-label">Nombre del chofer *</label>
                            <input
                                className="form-input"
                                value={formCrear.nombre}
                                onChange={e => setFormCrear({ ...formCrear, nombre: e.target.value })}
                                placeholder="Nombre completo"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Correo electrónico *</label>
                            <input
                                className="form-input"
                                type="email"
                                value={formCrear.email}
                                onChange={e => setFormCrear({ ...formCrear, email: e.target.value })}
                                placeholder="chofer@ejemplo.com"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contraseña inicial *</label>
                            <input
                                className="form-input"
                                type="password"
                                value={formCrear.password}
                                onChange={e => setFormCrear({ ...formCrear, password: e.target.value })}
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalCrearAbierto(false)}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={handleGuardarNuevo}>
                                Registrar Chofer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* Modal: Editar Chofer                                         */}
            {/* ============================================================ */}
            {modalEditarAbierto && choferEditando && (
                <div className="modal-overlay" onClick={() => setModalEditarAbierto(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Editar: {choferEditando.nombre}</h3>
                            <button className="modal-close" onClick={() => setModalEditarAbierto(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>

                        {error && <div className="alert alert-error">{error}</div>}

                        <div className="form-group">
                            <label className="form-label">Nombre *</label>
                            <input
                                className="form-input"
                                value={formEditar.nombre}
                                onChange={e => setFormEditar({ ...formEditar, nombre: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Correo electrónico *</label>
                            <input
                                className="form-input"
                                type="email"
                                value={formEditar.email}
                                onChange={e => setFormEditar({ ...formEditar, email: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nueva contraseña</label>
                            <input
                                className="form-input"
                                type="password"
                                value={formEditar.password}
                                onChange={e => setFormEditar({ ...formEditar, password: e.target.value })}
                                placeholder="Dejar vacío para no cambiar"
                            />
                            <span className="text-muted" style={{ fontSize: "12px", marginTop: "4px", display: "block" }}>
                                Solo se actualizará si escribes una nueva contraseña.
                            </span>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Grúa Asignada</label>
                            <select
                                className="form-select"
                                value={formEditar.camion_asignado_id}
                                onChange={e => setFormEditar({ ...formEditar, camion_asignado_id: e.target.value })}
                            >
                                <option value="">— Sin asignar —</option>
                                {camiones.map(c => {
                                    const asignadoA = camionAsignadoA[c.id];
                                    return (
                                        <option key={c.id} value={c.id} disabled={!!asignadoA}>
                                            {c.placa} — {c.tipo_grua_nombre} ({c.marca} {c.modelo}){asignadoA ? ` (Chofer: ${asignadoA})` : ""}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalEditarAbierto(false)}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={handleGuardarEdicion}>
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Componentes Internos
// ============================================================================

/**
 * Tarjeta de servicio con detalles expandidos y botones de sobrescritura
 * administrativa. Muestra informacion del cliente, grua, ubicaciones, fechas
 * relevantes y permite forzar cambios de estado en el flujo del servicio.
 *
 * @param servicio - Datos completos de la solicitud de servicio
 * @param onActualizar - Callback para forzar un cambio de estado
 * @param isSubmitting - Indica si se esta procesando una accion sobre este servicio
 */
function ServicioAdminCard({
    servicio,
    onActualizar,
    isSubmitting,
}: {
    servicio: Solicitud;
    onActualizar: (id: number, estado: string) => void;
    isSubmitting: boolean;
}) {
    /** Determina la clase CSS del badge segun el estado del servicio */
    const badgeMap: Record<string, { clase: string; icono: string }> = {
        "Asignada": { clase: "badge-asignada", icono: "clock" },
        "En camino": { clase: "badge-info", icono: "route" },
        "Atendiendo": { clase: "badge-warning", icono: "wrench" },
        "Finalizada": { clase: "badge-finalizada", icono: "check-circle" },
        "Cancelada": { clase: "badge-cancelada", icono: "close" },
        "Pendiente": { clase: "badge-pendiente", icono: "clock" },
    };

    const badge = badgeMap[servicio.estado] || { clase: "badge-info", icono: "clock" };

    /** El servicio esta en un estado terminal (no permite mas acciones) */
    const esFinalizado = servicio.estado === "Finalizada" || servicio.estado === "Cancelada";

    return (
        <div className="glass-panel" style={{ padding: "20px" }}>
            {/* Encabezado: numero de servicio y badge de estado */}
            <div
                className="flex justify-between items-center mb-1 pb-1"
                style={{ borderBottom: "1px solid var(--border-color)" }}
            >
                <span style={{ fontSize: "16px", fontWeight: "bold" }}>{servicio.numero_servicio}</span>
                <span className={`badge ${badge.clase}`}>
                    <Icon name={badge.icono} size={14} />
                    {servicio.estado}
                </span>
            </div>

            {/* Detalles del servicio en grid 2 columnas */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginBottom: "16px",
                }}
            >
                <div style={{ fontSize: "13px" }}>
                    <div className="text-muted">Cliente</div>
                    <div style={{ fontWeight: 600 }}>{servicio.cliente_nombre}</div>
                </div>
                <div style={{ fontSize: "13px" }}>
                    <div className="text-muted">Teléfono</div>
                    <div style={{ fontWeight: 600 }}>{servicio.cliente_telefono || "—"}</div>
                </div>
                <div style={{ fontSize: "13px" }}>
                    <div className="text-muted">Grúa asignada</div>
                    <div style={{ fontWeight: 600 }}>{servicio.camion_placa || "Sin asignar"}</div>
                </div>
                <div style={{ fontSize: "13px" }}>
                    <div className="text-muted">Tipo de servicio</div>
                    <div style={{ fontWeight: 600 }}>{servicio.tipo_servicio || "—"}</div>
                </div>
                <div style={{ fontSize: "13px", gridColumn: "span 2" }}>
                    <div className="text-muted">Ubicación</div>
                    <div style={{ fontWeight: 500, color: "var(--color-primary)" }}>
                        {servicio.ubicacion_origen}
                        {servicio.ubicacion_destino && ` → ${servicio.ubicacion_destino}`}
                    </div>
                </div>
                {servicio.descripcion_problema && (
                    <div style={{ fontSize: "13px", gridColumn: "span 2" }}>
                        <div className="text-muted">Problema</div>
                        <div>{servicio.descripcion_problema}</div>
                    </div>
                )}
                <div style={{ fontSize: "13px" }}>
                    <div className="text-muted">Fecha solicitud</div>
                    <div>{formatearFecha(servicio.fecha_solicitud)}</div>
                </div>
                {servicio.fecha_finalizacion && (
                    <div style={{ fontSize: "13px" }}>
                        <div className="text-muted">Fecha finalización</div>
                        <div>{formatearFecha(servicio.fecha_finalizacion)}</div>
                    </div>
                )}
            </div>

            {/* Acciones de sobrescritura administrativa (solo para servicios no finalizados) */}
            {!esFinalizado && (
                <div style={{ background: "var(--bg-surface)", padding: "12px", borderRadius: "8px" }}>
                    <div
                        className="text-muted mb-1"
                        style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}
                    >
                        Acciones de Sobrescritura (Admin)
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {servicio.estado === "Asignada" && (
                            <button
                                className="btn btn-primary btn-sm flex-1"
                                style={{ justifyContent: "center" }}
                                onClick={() => onActualizar(servicio.id, "En camino")}
                                disabled={isSubmitting}
                            >
                                <Icon name="play" size={16} /> Forzar: En Camino
                            </button>
                        )}
                        {servicio.estado === "En camino" && (
                            <button
                                className="btn btn-sm flex-1"
                                style={{
                                    justifyContent: "center",
                                    backgroundColor: "#f59e0b",
                                    color: "#fff",
                                    border: "none",
                                }}
                                onClick={() => onActualizar(servicio.id, "Atendiendo")}
                                disabled={isSubmitting}
                            >
                                <Icon name="wrench" size={16} /> Forzar: Atendiendo
                            </button>
                        )}
                        {servicio.estado === "Atendiendo" && (
                            <button
                                className="btn btn-success btn-sm flex-1"
                                style={{ justifyContent: "center" }}
                                onClick={() => onActualizar(servicio.id, "Finalizada")}
                                disabled={isSubmitting}
                            >
                                <Icon name="check-circle" size={16} /> Forzar: Finalizar
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
