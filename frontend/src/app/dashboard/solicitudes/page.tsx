"use client";

/**
 * ============================================================================
 * Página de Solicitudes de Servicio
 * ============================================================================
 * CRUD completo: crear, listar, editar, asignar grúa/chofer,
 * cambiar estado y eliminar solicitudes (admin).
 * ============================================================================
 */

import { useEffect, useState, useMemo } from "react";
import {
    listarSolicitudes, crearSolicitud, actualizarSolicitud, eliminarSolicitud,
    asignarGrua, reasignarGrua, actualizarEstadoSolicitud, listarCamiones, listarUsuarios,
    listarClientes, obtenerEvaluacionPorSolicitud,
} from "@/lib/api";
import { Solicitud, Camion, UsuarioCompleto, Cliente, Evaluacion } from "@/types";
import Icon from "@/components/Icon";
import StarRating from "@/components/StarRating";

const ESTADOS = ["Todas", "Pendiente", "Asignada", "En camino", "Atendiendo", "Finalizada", "Cancelada"];

export default function SolicitudesPage() {
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [filtroActual, setFiltroActual] = useState("Todas");
    const [loading, setLoading] = useState(true);
    const [userRol, setUserRol] = useState("");

    // Modales
    const [modalCrear, setModalCrear] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [modalAsignar, setModalAsignar] = useState(false);
    const [modalReasignar, setModalReasignar] = useState(false);
    const [modalEstado, setModalEstado] = useState(false);
    const [modalDetalle, setModalDetalle] = useState(false);

    // Solicitud seleccionada para editar/asignar/estado/detalle
    const [solicitudSel, setSolicitudSel] = useState<Solicitud | null>(null);

    // Evaluacion del modal de detalle
    const [evaluacionDetalle, setEvaluacionDetalle] = useState<Evaluacion | null>(null);
    const [loadingEvaluacion, setLoadingEvaluacion] = useState(false);

    // Datos auxiliares
    const [camionesDisponibles, setCamionesDisponibles] = useState<Camion[]>([]);
    const [choferes, setChoferes] = useState<UsuarioCompleto[]>([]);

    // Selector de cliente para modal crear
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
    const [busquedaCliente, setBusquedaCliente] = useState("");
    const [mostrarListaClientes, setMostrarListaClientes] = useState(false);

    // Formularios
    const [formCrear, setFormCrear] = useState({
        cliente_id: 0,
        ubicacion_origen: "", ubicacion_destino: "",
        descripcion_problema: "", tipo_servicio: "Estándar", prioridad: "Normal", notas_internas: "",
    });
    const [formEditar, setFormEditar] = useState({
        ubicacion_origen: "", ubicacion_destino: "",
        descripcion_problema: "", tipo_servicio: "", prioridad: "", notas_internas: "",
    });
    const [asignarForm, setAsignarForm] = useState({ camion_id: 0, chofer_id: 0 });
    const [reasignarForm, setReasignarForm] = useState({ camion_id: 0, chofer_id: 0 });
    const [nuevoEstado, setNuevoEstado] = useState("");

    // Mensajes
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    // Cargar rol del usuario desde localStorage
    useEffect(() => {
        const userData = localStorage.getItem("usuario");
        if (userData) {
            const u = JSON.parse(userData);
            setUserRol(u.rol);
        }
    }, []);

    const esAdmin = userRol === "Administrador";

    // ======================== Carga de datos ========================

    async function cargarSolicitudes(silencioso = false) {
        if (!silencioso) setLoading(true);
        try {
            const res = await listarSolicitudes(filtroActual);
            if (res.success && res.data) setSolicitudes(res.data);
        } catch { if (!silencioso) setError("Error al cargar solicitudes."); }
        if (!silencioso) setLoading(false);
    }

    useEffect(() => {
        cargarSolicitudes();
        const intervalo = setInterval(() => cargarSolicitudes(true), 15000);
        return () => clearInterval(intervalo);
    }, [filtroActual]);

    useEffect(() => {
        if (modalDetalle && solicitudSel?.estado === 'Finalizada') {
            setLoadingEvaluacion(true);
            obtenerEvaluacionPorSolicitud(solicitudSel.id)
                .then(res => setEvaluacionDetalle(res.success && res.data ? res.data : null))
                .catch(() => setEvaluacionDetalle(null))
                .finally(() => setLoadingEvaluacion(false));
        } else {
            setEvaluacionDetalle(null);
        }
    }, [modalDetalle, solicitudSel]);

    function mostrarMensaje(texto: string) {
        setMensaje(texto);
        setTimeout(() => setMensaje(""), 3000);
    }

    // ======================== Crear ========================

    async function abrirModalCrear() {
        setError("");
        setClienteSeleccionado(null);
        setBusquedaCliente("");
        setMostrarListaClientes(false);
        setFormCrear({ cliente_id: 0, ubicacion_origen: "", ubicacion_destino: "", descripcion_problema: "", tipo_servicio: "Estándar", prioridad: "Normal", notas_internas: "" });
        try {
            const res = await listarClientes();
            if (res.success && res.data) setClientes(res.data.filter(c => c.activo));
        } catch { /* sin acción */ }
        setModalCrear(true);
    }

    async function handleCrear() {
        setError("");
        if (!clienteSeleccionado) {
            setError("Debe seleccionar un cliente registrado.");
            return;
        }
        if (!formCrear.ubicacion_origen) {
            setError("La ubicación de origen es requerida.");
            return;
        }
        try {
            const res = await crearSolicitud({ ...formCrear, cliente_id: clienteSeleccionado.id });
            if (res.success) {
                mostrarMensaje(res.message || "Solicitud creada exitosamente.");
                setModalCrear(false);
                cargarSolicitudes();
            } else { setError(res.message || "Error al crear solicitud."); }
        } catch { setError("Error de conexión."); }
    }

    // ======================== Editar ========================

    function abrirModalEditar(s: Solicitud) {
        setSolicitudSel(s);
        setFormEditar({
            ubicacion_origen: s.ubicacion_origen,
            ubicacion_destino: s.ubicacion_destino || "",
            descripcion_problema: s.descripcion_problema || "",
            tipo_servicio: s.tipo_servicio || "Estándar",
            prioridad: s.prioridad || "Normal",
            notas_internas: s.notas_internas || "",
        });
        setError("");
        setModalEditar(true);
    }

    async function handleEditar() {
        if (!solicitudSel) return;
        setError("");
        if (!formEditar.ubicacion_origen) {
            setError("La ubicación de origen es requerida.");
            return;
        }
        try {
            const res = await actualizarSolicitud(solicitudSel.id, formEditar);
            if (res.success) {
                mostrarMensaje("Solicitud actualizada exitosamente.");
                setModalEditar(false);
                cargarSolicitudes();
            } else { setError(res.message || "Error al actualizar."); }
        } catch { setError("Error de conexión."); }
    }

    // ======================== Eliminar ========================

    async function handleEliminar(s: Solicitud) {
        if (!confirm(`¿Estás seguro de eliminar la solicitud ${s.numero_servicio}? Esta acción es permanente.`)) return;
        try {
            const res = await eliminarSolicitud(s.id);
            if (res.success) {
                mostrarMensaje("Solicitud eliminada exitosamente.");
                cargarSolicitudes();
            } else { setError(res.message || "Error al eliminar."); }
        } catch { setError("Error de conexión."); }
    }

    // ======================== Asignar grúa/chofer ========================

    async function abrirModalAsignar(solicitud: Solicitud) {
        setSolicitudSel(solicitud);
        setAsignarForm({ camion_id: 0, chofer_id: 0 });
        setError("");
        try {
            const [resC, resU] = await Promise.all([listarCamiones(), listarUsuarios()]);
            if (resC.success && resC.data)
                setCamionesDisponibles(resC.data.filter(c => c.estado === "Disponible"));
            if (resU.success && resU.data)
                setChoferes(resU.data.filter(u => u.rol_nombre === "Chofer" && u.activo));
        } catch { /* sin acción */ }
        setModalAsignar(true);
    }

    /** Mapa de chofer asignado por camión */
    const choferPorCamion = useMemo(() => {
        const mapa: Record<number, number | null> = {};
        camionesDisponibles.forEach(c => {
            mapa[c.id] = c.chofer_asignado_id;
        });
        return mapa;
    }, [camionesDisponibles]);

    /** Mapa de chofer_id > estado del servicio activo (si tiene uno no finalizado/cancelado) */
    const choferOcupado = useMemo(() => {
        const mapa: Record<number, string> = {};
        solicitudes.forEach(s => {
            if (s.chofer_id && (s.estado === "Asignada" || s.estado === "En camino" || s.estado === "Atendiendo")) {
                mapa[s.chofer_id] = s.estado;
            }
        });
        return mapa;
    }, [solicitudes]);

    /** Cuando se selecciona un camión, auto-seleccionar su chofer asignado (solo si no está ocupado) */
    function handleCamionChange(camionId: number) {
        const choferAsignado = choferPorCamion[camionId] || 0;
        const estaOcupado = choferAsignado ? !!choferOcupado[choferAsignado] : false;
        setAsignarForm({ camion_id: camionId, chofer_id: estaOcupado ? 0 : choferAsignado });
    }

    async function handleAsignar() {
        if (!solicitudSel || !asignarForm.camion_id) {
            setError("Seleccione un camión."); return;
        }
        if (!asignarForm.chofer_id) {
            setError("Seleccione un chofer para la asignación."); return;
        }
        try {
            const res = await asignarGrua(solicitudSel.id, asignarForm.camion_id, asignarForm.chofer_id);
            if (res.success) {
                mostrarMensaje("Grúa y chofer asignados exitosamente.");
                setModalAsignar(false);
                cargarSolicitudes();
            } else { setError(res.message || "Error al asignar."); }
        } catch { setError("Error de conexión."); }
    }

    // ======================== Reasignar grúa/chofer ========================

    async function abrirModalReasignar(solicitud: Solicitud) {
        setSolicitudSel(solicitud);
        setReasignarForm({ camion_id: solicitud.camion_id || 0, chofer_id: solicitud.chofer_id || 0 });
        setError("");
        try {
            const [resC, resU] = await Promise.all([listarCamiones(), listarUsuarios()]);
            if (resC.success && resC.data) {
                // Incluir camiones disponibles + el camión actualmente asignado a esta solicitud
                const disponiblesOReasignado = resC.data.filter(
                    c => c.estado === "Disponible" || c.id === solicitud.camion_id
                );
                setCamionesDisponibles(disponiblesOReasignado);
            }
            if (resU.success && resU.data)
                setChoferes(resU.data.filter(u => u.rol_nombre === "Chofer" && u.activo));
        } catch { /* sin acción */ }
        setModalReasignar(true);
    }

    function handleReasignarCamionChange(camionId: number) {
        const choferAsignado = choferPorCamion[camionId] || 0;
        const estaOcupado = choferAsignado ? !!choferOcupado[choferAsignado] : false;
        setReasignarForm({ camion_id: camionId, chofer_id: estaOcupado ? 0 : choferAsignado });
    }

    async function handleReasignar() {
        if (!solicitudSel || !reasignarForm.camion_id) {
            setError("Seleccione un camión."); return;
        }
        if (!reasignarForm.chofer_id) {
            setError("Seleccione un chofer para la reasignación."); return;
        }
        if (reasignarForm.camion_id === solicitudSel.camion_id && reasignarForm.chofer_id === solicitudSel.chofer_id) {
            setError("Debe cambiar al menos el camión o el chofer."); return;
        }
        try {
            const res = await reasignarGrua(solicitudSel.id, reasignarForm.camion_id, reasignarForm.chofer_id);
            if (res.success) {
                mostrarMensaje("Grúa y chofer reasignados exitosamente.");
                setModalReasignar(false);
                cargarSolicitudes();
            } else { setError(res.message || "Error al reasignar."); }
        } catch { setError("Error de conexión."); }
    }

    // ======================== Cambiar estado ========================

    function abrirModalEstado(s: Solicitud) {
        setSolicitudSel(s);
        setNuevoEstado("");
        setError("");
        setModalEstado(true);
    }

    const estadosSiguientes: Record<string, string[]> = {
        "Pendiente": ["Cancelada"],
        "Asignada": ["En camino", "Cancelada"],
        "En camino": ["Atendiendo", "Cancelada"],
        "Atendiendo": ["Finalizada", "Cancelada"],
    };

    async function handleCambiarEstado() {
        if (!solicitudSel || !nuevoEstado) {
            setError("Seleccione un estado."); return;
        }
        try {
            const res = await actualizarEstadoSolicitud(solicitudSel.id, nuevoEstado);
            if (res.success) {
                mostrarMensaje(`Estado actualizado a "${nuevoEstado}".`);
                setModalEstado(false);
                cargarSolicitudes();
            } else { setError(res.message || "Error al cambiar estado."); }
        } catch { setError("Error de conexión."); }
    }

    // ======================== Detalle ========================

    function abrirDetalle(s: Solicitud) {
        setSolicitudSel(s);
        setModalDetalle(true);
    }

    // ======================== Utilidades ========================

    function getBadgeClass(estado: string): string {
        const map: Record<string, string> = {
            "Pendiente": "badge-pendiente", "Asignada": "badge-asignada",
            "En camino": "badge-info", "Atendiendo": "badge-warning",
            "Finalizada": "badge-finalizada", "Cancelada": "badge-cancelada",
        };
        return map[estado] || "badge-info";
    }

    function formatFecha(fecha: string): string {
        return new Date(fecha).toLocaleDateString("es-CR", {
            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
        });
    }

    const puedeEditar = (s: Solicitud) => s.estado !== "Finalizada" && s.estado !== "Cancelada";
    const puedeCambiarEstado = (s: Solicitud) => s.estado !== "Finalizada" && s.estado !== "Cancelada";

    // ======================== Render ========================

    return (
        <div className="page-enter">
            {mensaje && <div className="alert alert-success">{mensaje}</div>}
            {error && !modalCrear && !modalEditar && !modalAsignar && !modalReasignar && !modalEstado && (
                <div className="alert alert-error">{error}</div>
            )}

            <div className="glass-panel" style={{ padding: "20px" }}>
                <div className="panel-header">
                    <div className="tabs">
                        {ESTADOS.map(estado => (
                            <button key={estado}
                                className={`tab ${filtroActual === estado ? "tab-active" : ""}`}
                                onClick={() => setFiltroActual(estado)}>
                                {estado}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={abrirModalCrear}>
                        <Icon name="add" size={18} /> Nueva Solicitud
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">Cargando...</div>
                ) : solicitudes.length > 0 ? (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th># Servicio</th><th>Cliente</th><th>Origen</th>
                                    <th>Destino</th><th>Grúa</th><th>Chofer</th><th>Estado</th>
                                    <th>Prioridad</th><th>Fecha</th><th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {solicitudes.map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => abrirDetalle(s)}>
                                            {s.numero_servicio}
                                        </td>
                                        <td>{s.cliente_nombre}</td>
                                        <td>{s.ubicacion_origen}</td>
                                        <td>{s.ubicacion_destino || "—"}</td>
                                        <td>{s.camion_placa || "—"}</td>
                                        <td>{s.chofer_nombre || "—"}</td>
                                        <td><span className={`badge ${getBadgeClass(s.estado)}`}>{s.estado}</span></td>
                                        <td>{s.prioridad}</td>
                                        <td className="text-muted">{formatFecha(s.fecha_solicitud)}</td>
                                        <td>
                                            <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
                                                {s.estado === "Pendiente" && (
                                                    <button className="btn btn-success btn-sm" onClick={() => abrirModalAsignar(s)}>
                                                        <Icon name="assign" size={14} /> Asignar
                                                    </button>
                                                )}
                                                {["Asignada", "En camino", "Atendiendo"].includes(s.estado) && (
                                                    <button className="btn btn-warning btn-sm" onClick={() => abrirModalReasignar(s)}>
                                                        <Icon name="assign" size={14} /> Reasignar
                                                    </button>
                                                )}
                                                {puedeCambiarEstado(s) && s.estado !== "Pendiente" && (
                                                    <button className="btn btn-ghost btn-sm" onClick={() => abrirModalEstado(s)}>
                                                        <Icon name="arrowRight" size={14} /> Estado
                                                    </button>
                                                )}
                                                {puedeEditar(s) && (
                                                    <button className="btn btn-ghost btn-sm" onClick={() => abrirModalEditar(s)}>
                                                        <Icon name="edit" size={14} /> Editar
                                                    </button>
                                                )}
                                                {esAdmin && s.estado !== "Finalizada" && (
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleEliminar(s)}>
                                                        <Icon name="close" size={14} /> Eliminar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center text-muted" style={{ padding: "40px" }}>
                        <Icon name="solicitudes" size={40} />
                        <p className="mt-1">No hay solicitudes {filtroActual !== "Todas" ? `con estado "${filtroActual}"` : "registradas"}.</p>
                    </div>
                )}
            </div>

            {/* ============================================================ */}
            {/* Modal: Crear Solicitud                                       */}
            {/* ============================================================ */}
            {modalCrear && (
                <div className="modal-overlay" onClick={() => setModalCrear(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Nueva Solicitud de Servicio</h3>
                            <button className="modal-close" onClick={() => setModalCrear(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}

                        {/* Selector de cliente */}
                        <div className="form-group">
                            <label className="form-label">Cliente *</label>
                            {clienteSeleccionado ? (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--color-primary-subtle)", border: "1px solid var(--color-primary)", borderRadius: "8px" }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: "14px" }}>{clienteSeleccionado.nombre} {clienteSeleccionado.apellido}</div>
                                        <div className="text-muted" style={{ fontSize: "12px" }}>{clienteSeleccionado.telefono}{clienteSeleccionado.correo ? ` · ${clienteSeleccionado.correo}` : ""}</div>
                                    </div>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setClienteSeleccionado(null); setBusquedaCliente(""); }}>Cambiar</button>
                                </div>
                            ) : (
                                <div style={{ position: "relative" }}>
                                    <input
                                        className="form-input"
                                        placeholder="Buscar por nombre, cédula o teléfono..."
                                        value={busquedaCliente}
                                        onChange={e => { setBusquedaCliente(e.target.value); setMostrarListaClientes(true); }}
                                        onFocus={() => setMostrarListaClientes(true)}
                                        autoComplete="off"
                                    />
                                    {mostrarListaClientes && busquedaCliente.length > 0 && (
                                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200, background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "8px", marginTop: "4px", maxHeight: "200px", overflowY: "auto", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
                                            {clientes
                                                .filter(c => {
                                                    const q = busquedaCliente.toLowerCase();
                                                    return `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) || c.cedula.includes(q) || c.telefono.includes(q);
                                                })
                                                .map(c => (
                                                    <button
                                                        key={c.id}
                                                        style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer", display: "block" }}
                                                        onMouseDown={() => { setClienteSeleccionado(c); setBusquedaCliente(""); setMostrarListaClientes(false); }}
                                                    >
                                                        <div style={{ fontWeight: 600, fontSize: "13px" }}>{c.nombre} {c.apellido}</div>
                                                        <div className="text-muted" style={{ fontSize: "11px" }}>CI: {c.cedula} · {c.telefono}</div>
                                                    </button>
                                                ))}
                                            {clientes.filter(c => {
                                                const q = busquedaCliente.toLowerCase();
                                                return `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) || c.cedula.includes(q) || c.telefono.includes(q);
                                            }).length === 0 && (
                                                <div className="text-muted" style={{ padding: "12px 14px", fontSize: "13px" }}>Sin resultados.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="form-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                            <div className="form-group">
                                <label className="form-label">Ubicación de origen *</label>
                                <input className="form-input" value={formCrear.ubicacion_origen}
                                    onChange={e => setFormCrear({ ...formCrear, ubicacion_origen: e.target.value })}
                                    placeholder="Dirección de origen" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ubicación de destino</label>
                                <input className="form-input" value={formCrear.ubicacion_destino}
                                    onChange={e => setFormCrear({ ...formCrear, ubicacion_destino: e.target.value })}
                                    placeholder="Dirección de destino" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Descripción del problema</label>
                            <textarea className="form-textarea" value={formCrear.descripcion_problema}
                                onChange={e => setFormCrear({ ...formCrear, descripcion_problema: e.target.value })}
                                placeholder="Descripción del servicio requerido" />
                        </div>
                        <div className="form-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                            <div className="form-group">
                                <label className="form-label">Tipo de servicio</label>
                                <select className="form-select" value={formCrear.tipo_servicio}
                                    onChange={e => setFormCrear({ ...formCrear, tipo_servicio: e.target.value })}>
                                    <option value="Estándar">Estándar</option>
                                    <option value="Pesado">Pesado</option>
                                    <option value="Especial">Especial</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Prioridad</label>
                                <select className="form-select" value={formCrear.prioridad}
                                    onChange={e => setFormCrear({ ...formCrear, prioridad: e.target.value })}>
                                    <option value="Baja">Baja</option>
                                    <option value="Normal">Normal</option>
                                    <option value="Alta">Alta</option>
                                    <option value="Urgente">Urgente</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notas internas</label>
                            <textarea className="form-textarea" value={formCrear.notas_internas}
                                onChange={e => setFormCrear({ ...formCrear, notas_internas: e.target.value })}
                                placeholder="Notas visibles solo para el equipo" />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalCrear(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleCrear}>Crear Solicitud</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* Modal: Editar Solicitud                                      */}
            {/* ============================================================ */}
            {modalEditar && solicitudSel && (
                <div className="modal-overlay" onClick={() => setModalEditar(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Editar: {solicitudSel.numero_servicio}</h3>
                            <button className="modal-close" onClick={() => setModalEditar(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}

                        {/* Cliente fijo — no editable */}
                        <div className="form-group">
                            <label className="form-label">Cliente</label>
                            <div style={{ padding: "10px 14px", background: "var(--bg-subtle)", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "14px" }}>
                                <span style={{ fontWeight: 600 }}>{solicitudSel.cliente_nombre}</span>
                                {solicitudSel.cliente_telefono && <span className="text-muted"> · {solicitudSel.cliente_telefono}</span>}
                            </div>
                        </div>

                        <div className="form-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                            <div className="form-group">
                                <label className="form-label">Ubicación de origen *</label>
                                <input className="form-input" value={formEditar.ubicacion_origen}
                                    onChange={e => setFormEditar({ ...formEditar, ubicacion_origen: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ubicación de destino</label>
                                <input className="form-input" value={formEditar.ubicacion_destino}
                                    onChange={e => setFormEditar({ ...formEditar, ubicacion_destino: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Descripción del problema</label>
                            <textarea className="form-textarea" value={formEditar.descripcion_problema}
                                onChange={e => setFormEditar({ ...formEditar, descripcion_problema: e.target.value })} />
                        </div>
                        <div className="form-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                            <div className="form-group">
                                <label className="form-label">Tipo de servicio</label>
                                <select className="form-select" value={formEditar.tipo_servicio}
                                    onChange={e => setFormEditar({ ...formEditar, tipo_servicio: e.target.value })}>
                                    <option value="Estándar">Estándar</option>
                                    <option value="Pesado">Pesado</option>
                                    <option value="Especial">Especial</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Prioridad</label>
                                <select className="form-select" value={formEditar.prioridad}
                                    onChange={e => setFormEditar({ ...formEditar, prioridad: e.target.value })}>
                                    <option value="Baja">Baja</option>
                                    <option value="Normal">Normal</option>
                                    <option value="Alta">Alta</option>
                                    <option value="Urgente">Urgente</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notas internas</label>
                            <textarea className="form-textarea" value={formEditar.notas_internas}
                                onChange={e => setFormEditar({ ...formEditar, notas_internas: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalEditar(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleEditar}>Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* Modal: Asignar Grúa + Chofer                                 */}
            {/* ============================================================ */}
            {modalAsignar && solicitudSel && (
                <div className="modal-overlay" onClick={() => setModalAsignar(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Asignar Grúa — {solicitudSel.numero_servicio}</h3>
                            <button className="modal-close" onClick={() => setModalAsignar(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}

                        <div style={{ padding: "12px", background: "var(--bg-subtle)", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
                            <div><strong>Cliente:</strong> {solicitudSel.cliente_nombre}</div>
                            <div><strong>Origen:</strong> {solicitudSel.ubicacion_origen}</div>
                            {solicitudSel.ubicacion_destino && <div><strong>Destino:</strong> {solicitudSel.ubicacion_destino}</div>}
                            <div><strong>Prioridad:</strong> {solicitudSel.prioridad}</div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Seleccionar grúa disponible *</label>
                            <select className="form-select" value={asignarForm.camion_id}
                                onChange={e => handleCamionChange(parseInt(e.target.value))}>
                                <option value={0}>— Seleccione una grúa —</option>
                                {camionesDisponibles.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.placa} — {c.tipo_grua_nombre} ({c.marca} {c.modelo})
                                        {c.chofer_nombre ? ` [Chofer: ${c.chofer_nombre}]` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Chofer asignado *</label>
                            <select className="form-select" value={asignarForm.chofer_id}
                                onChange={e => setAsignarForm({ ...asignarForm, chofer_id: parseInt(e.target.value) })}>
                                <option value={0}>— Seleccione un chofer —</option>
                                {choferes.map(ch => {
                                    const estadoActivo = choferOcupado[ch.id];
                                    return (
                                        <option key={ch.id} value={ch.id} disabled={!!estadoActivo}>
                                            {ch.nombre}{estadoActivo ? ` (Ocupado: ${estadoActivo})` : ""}
                                        </option>
                                    );
                                })}
                            </select>
                            {asignarForm.camion_id > 0 && choferPorCamion[asignarForm.camion_id] && (
                                <span className="text-muted" style={{ fontSize: "12px", marginTop: "4px", display: "block" }}>
                                    Chofer pre-asignado al camión seleccionado automáticamente.
                                </span>
                            )}
                        </div>

                        {camionesDisponibles.length === 0 && (
                            <div className="alert alert-error">No hay grúas disponibles actualmente.</div>
                        )}
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalAsignar(false)}>Cancelar</button>
                            <button className="btn btn-success" onClick={handleAsignar}
                                disabled={asignarForm.camion_id === 0 || asignarForm.chofer_id === 0}>
                                Asignar Grúa y Chofer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* Modal: Reasignar Grúa + Chofer                               */}
            {/* ============================================================ */}
            {modalReasignar && solicitudSel && (
                <div className="modal-overlay" onClick={() => setModalReasignar(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Reasignar Grúa — {solicitudSel.numero_servicio}</h3>
                            <button className="modal-close" onClick={() => setModalReasignar(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}

                        <div style={{ padding: "12px", background: "var(--bg-subtle)", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
                            <div><strong>Cliente:</strong> {solicitudSel.cliente_nombre}</div>
                            <div><strong>Origen:</strong> {solicitudSel.ubicacion_origen}</div>
                            <div><strong>Estado:</strong> <span className={`badge ${getBadgeClass(solicitudSel.estado)}`}>{solicitudSel.estado}</span></div>
                            <div style={{ marginTop: "8px", padding: "8px", background: "var(--color-warning-subtle)", borderRadius: "6px" }}>
                                <strong>Asignación actual:</strong> Grúa {solicitudSel.camion_placa || "—"} · Chofer {solicitudSel.chofer_nombre || "—"}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nueva grúa *</label>
                            <select className="form-select" value={reasignarForm.camion_id}
                                onChange={e => handleReasignarCamionChange(parseInt(e.target.value))}>
                                <option value={0}>— Seleccione una grúa —</option>
                                {camionesDisponibles.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.placa} — {c.tipo_grua_nombre} ({c.marca} {c.modelo})
                                        {c.id === solicitudSel.camion_id ? " [Actual]" : ""}
                                        {c.chofer_nombre ? ` [Chofer: ${c.chofer_nombre}]` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nuevo chofer *</label>
                            <select className="form-select" value={reasignarForm.chofer_id}
                                onChange={e => setReasignarForm({ ...reasignarForm, chofer_id: parseInt(e.target.value) })}>
                                <option value={0}>— Seleccione un chofer —</option>
                                {choferes.map(ch => {
                                    const estadoActivo = choferOcupado[ch.id];
                                    const esActual = ch.id === solicitudSel.chofer_id;
                                    return (
                                        <option key={ch.id} value={ch.id} disabled={!!estadoActivo && !esActual}>
                                            {ch.nombre}{esActual ? " [Actual]" : ""}{estadoActivo && !esActual ? ` (Ocupado: ${estadoActivo})` : ""}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div className="alert alert-info" style={{ fontSize: "13px" }}>
                            Al reasignar, la grúa anterior será liberada automáticamente y la nueva será marcada como "En servicio".
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalReasignar(false)}>Cancelar</button>
                            <button className="btn btn-warning" onClick={handleReasignar}
                                disabled={reasignarForm.camion_id === 0 || reasignarForm.chofer_id === 0}>
                                Confirmar Reasignación
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* Modal: Cambiar Estado                                        */}
            {/* ============================================================ */}
            {modalEstado && solicitudSel && (
                <div className="modal-overlay" onClick={() => setModalEstado(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Cambiar Estado — {solicitudSel.numero_servicio}</h3>
                            <button className="modal-close" onClick={() => setModalEstado(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}

                        <p className="text-muted mb-2">
                            Estado actual: <span className={`badge ${getBadgeClass(solicitudSel.estado)}`}>{solicitudSel.estado}</span>
                        </p>

                        {solicitudSel.chofer_nombre && (
                            <p className="text-muted mb-2" style={{ fontSize: "13px" }}>
                                Chofer: <strong>{solicitudSel.chofer_nombre}</strong> · Grúa: <strong>{solicitudSel.camion_placa}</strong>
                            </p>
                        )}

                        <div className="form-group">
                            <label className="form-label">Nuevo estado</label>
                            <select className="form-select" value={nuevoEstado}
                                onChange={e => setNuevoEstado(e.target.value)}>
                                <option value="">— Seleccione —</option>
                                {(estadosSiguientes[solicitudSel.estado] || []).map(est => (
                                    <option key={est} value={est}>{est}</option>
                                ))}
                            </select>
                        </div>

                        {nuevoEstado === "Cancelada" && (
                            <div className="alert alert-error" style={{ fontSize: "13px" }}>
                                Cancelar la solicitud liberará la grúa asignada (si aplica).
                            </div>
                        )}
                        {nuevoEstado === "Finalizada" && (
                            <div className="alert alert-success" style={{ fontSize: "13px" }}>
                                Finalizar el servicio liberará la grúa asignada.
                            </div>
                        )}

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalEstado(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleCambiarEstado} disabled={!nuevoEstado}>
                                Confirmar Cambio
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* Modal: Detalle de Solicitud                                  */}
            {/* ============================================================ */}
            {modalDetalle && solicitudSel && (
                <div className="modal-overlay" onClick={() => setModalDetalle(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "600px" }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{solicitudSel.numero_servicio}</h3>
                            <button className="modal-close" onClick={() => setModalDetalle(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>

                        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                            <span className={`badge ${getBadgeClass(solicitudSel.estado)}`}>{solicitudSel.estado}</span>
                            <span className="badge badge-info">{solicitudSel.prioridad}</span>
                            <span className="badge" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
                                {solicitudSel.tipo_servicio || "Estándar"}
                            </span>
                        </div>

                        <div className="form-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                            <div style={{ fontSize: "13px" }}>
                                <div className="text-muted">Cliente</div>
                                <div style={{ fontWeight: 600 }}>{solicitudSel.cliente_nombre}</div>
                            </div>
                            <div style={{ fontSize: "13px" }}>
                                <div className="text-muted">Teléfono</div>
                                <div style={{ fontWeight: 600 }}>{solicitudSel.cliente_telefono || "—"}</div>
                            </div>
                            <div style={{ fontSize: "13px" }}>
                                <div className="text-muted">Email</div>
                                <div style={{ fontWeight: 600 }}>{solicitudSel.cliente_email || "—"}</div>
                            </div>
                            <div style={{ fontSize: "13px" }}>
                                <div className="text-muted">Creado por</div>
                                <div style={{ fontWeight: 600 }}>{solicitudSel.creador_nombre}</div>
                            </div>
                        </div>

                        <div style={{ fontSize: "13px", marginBottom: "12px" }}>
                            <div className="text-muted">Origen</div>
                            <div style={{ fontWeight: 500, color: "var(--color-primary)" }}>{solicitudSel.ubicacion_origen}</div>
                        </div>
                        {solicitudSel.ubicacion_destino && (
                            <div style={{ fontSize: "13px", marginBottom: "12px" }}>
                                <div className="text-muted">Destino</div>
                                <div style={{ fontWeight: 500 }}>{solicitudSel.ubicacion_destino}</div>
                            </div>
                        )}
                        {solicitudSel.descripcion_problema && (
                            <div style={{ fontSize: "13px", marginBottom: "12px" }}>
                                <div className="text-muted">Descripción del problema</div>
                                <div>{solicitudSel.descripcion_problema}</div>
                            </div>
                        )}

                        {(solicitudSel.camion_placa || solicitudSel.chofer_nombre) && (
                            <div style={{ padding: "12px", background: "var(--bg-subtle)", borderRadius: "8px", marginBottom: "12px" }}>
                                <div className="form-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                    <div style={{ fontSize: "13px" }}>
                                        <div className="text-muted">Grúa asignada</div>
                                        <div style={{ fontWeight: 600 }}>{solicitudSel.camion_placa || "—"}</div>
                                    </div>
                                    <div style={{ fontSize: "13px" }}>
                                        <div className="text-muted">Chofer</div>
                                        <div style={{ fontWeight: 600 }}>{solicitudSel.chofer_nombre || "—"}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="form-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                            <div>
                                <span className="text-muted">Creada: </span>
                                {formatFecha(solicitudSel.fecha_solicitud)}
                            </div>
                            {solicitudSel.fecha_asignacion && (
                                <div>
                                    <span className="text-muted">Asignada: </span>
                                    {formatFecha(solicitudSel.fecha_asignacion)}
                                </div>
                            )}
                            {solicitudSel.fecha_inicio_servicio && (
                                <div>
                                    <span className="text-muted">Inicio servicio: </span>
                                    {formatFecha(solicitudSel.fecha_inicio_servicio)}
                                </div>
                            )}
                            {solicitudSel.fecha_finalizacion && (
                                <div>
                                    <span className="text-muted">Finalización: </span>
                                    {formatFecha(solicitudSel.fecha_finalizacion)}
                                </div>
                            )}
                        </div>

                        {solicitudSel.notas_internas && (
                            <div style={{ marginTop: "12px", padding: "10px", background: "var(--color-warning-subtle)", borderRadius: "8px", fontSize: "13px" }}>
                                <strong>Notas internas:</strong> {solicitudSel.notas_internas}
                            </div>
                        )}

                        {solicitudSel.estado === 'Finalizada' && (
                            <div style={{ marginTop: "16px", padding: "14px", background: "var(--bg-subtle)", borderRadius: "8px" }}>
                                <div style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
                                    Evaluación del servicio
                                </div>
                                {loadingEvaluacion ? (
                                    <span className="text-muted" style={{ fontSize: "13px" }}>Cargando evaluación...</span>
                                ) : evaluacionDetalle ? (
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                                            <StarRating value={evaluacionDetalle.calificacion} readonly size={20} />
                                            <span style={{ fontSize: "13px", fontWeight: 600 }}>{evaluacionDetalle.calificacion}/5</span>
                                        </div>
                                        {evaluacionDetalle.comentario && (
                                            <div style={{ fontSize: "13px", fontStyle: "italic", marginBottom: "6px" }}>
                                                "{evaluacionDetalle.comentario}"
                                            </div>
                                        )}
                                        <div className="text-muted" style={{ fontSize: "12px" }}>
                                            Por {evaluacionDetalle.cliente_nombre} · {new Date(evaluacionDetalle.fecha_creacion).toLocaleDateString("es-CR")}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-muted" style={{ fontSize: "13px" }}>Sin evaluación registrada.</span>
                                )}
                            </div>
                        )}

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalDetalle(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
