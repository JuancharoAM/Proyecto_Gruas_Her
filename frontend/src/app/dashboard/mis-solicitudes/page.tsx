"use client";

/**
 * ============================================================================
 * Página Mis Solicitudes (Vista para Clientes)
 * ============================================================================
 * Muestra al cliente sus solicitudes de servicio y permite crear nuevas.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { listarMisSolicitudes, crearSolicitud, crearEvaluacion, obtenerEvaluacionPorSolicitud } from "@/lib/api";
import { Solicitud, Usuario, Evaluacion } from "@/types";
import Icon from "@/components/Icon";
import StarRating from "@/components/StarRating";

export default function MisSolicitudesPage() {
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalCrear, setModalCrear] = useState(false);
    const [modalDetalle, setModalDetalle] = useState(false);
    const [solicitudDetalle, setSolicitudDetalle] = useState<Solicitud | null>(null);
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [form, setForm] = useState({
        ubicacion_origen: "", ubicacion_destino: "",
        descripcion_problema: "", tipo_servicio: "Estándar"
    });
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [modalEvaluar, setModalEvaluar] = useState(false);
    const [solicitudEvaluar, setSolicitudEvaluar] = useState<Solicitud | null>(null);
    const [evaluaciones, setEvaluaciones] = useState<Record<number, Evaluacion>>({});
    const [calificacion, setCalificacion] = useState(0);
    const [comentario, setComentario] = useState("");

    useEffect(() => {
        const userData = localStorage.getItem("usuario");
        if (userData) setUsuario(JSON.parse(userData));
    }, []);

    async function cargarEvaluaciones(solicitudes: Solicitud[]) {
        const finalizadas = solicitudes.filter(s => s.estado === "Finalizada");
        const evals: Record<number, Evaluacion> = {};
        for (const s of finalizadas) {
            try {
                const res = await obtenerEvaluacionPorSolicitud(s.id);
                if (res.success && res.data) evals[s.id] = res.data;
            } catch { /* empty */ }
        }
        setEvaluaciones(evals);
    }

    async function cargarSolicitudes(silencioso = false) {
        if (!silencioso) setLoading(true);
        try {
            const res = await listarMisSolicitudes();
            if (res.success && res.data) {
                setSolicitudes(res.data);
                cargarEvaluaciones(res.data);
            }
        } catch { if (!silencioso) setError("Error al cargar solicitudes."); }
        if (!silencioso) setLoading(false);
    }

    function abrirModalEvaluar(s: Solicitud) {
        setSolicitudEvaluar(s);
        setCalificacion(0);
        setComentario("");
        setError("");
        setModalEvaluar(true);
    }

    async function handleEvaluar() {
        setError("");
        if (!solicitudEvaluar) return;
        if (calificacion === 0) { setError("Seleccione una calificación."); return; }
        try {
            const res = await crearEvaluacion({
                solicitud_id: solicitudEvaluar.id,
                calificacion,
                comentario: comentario || undefined,
            });
            if (res.success) {
                setMensaje("¡Evaluación enviada! Gracias por su calificación.");
                setModalEvaluar(false);
                cargarSolicitudes();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error al enviar evaluación."); }
        } catch { setError("Error de conexión."); }
    }

    useEffect(() => {
        cargarSolicitudes();
        const intervalo = setInterval(() => cargarSolicitudes(true), 15000);
        return () => clearInterval(intervalo);
    }, []);

    async function handleCrear() {
        setError("");
        if (!form.ubicacion_origen) {
            setError("La ubicación de origen es requerida."); return;
        }
        if (!usuario) return;
        try {
            const res = await crearSolicitud({
                cliente_nombre: usuario.nombre,
                ubicacion_origen: form.ubicacion_origen,
                ubicacion_destino: form.ubicacion_destino || undefined,
                descripcion_problema: form.descripcion_problema || undefined,
                tipo_servicio: form.tipo_servicio,
            } as Partial<Solicitud>);
            if (res.success) {
                setMensaje("Solicitud enviada exitosamente.");
                setModalCrear(false); cargarSolicitudes();
                setForm({ ubicacion_origen: "", ubicacion_destino: "", descripcion_problema: "", tipo_servicio: "Estándar" });
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error al enviar solicitud."); }
        } catch { setError("Error de conexión."); }
    }

    function verDetalle(s: Solicitud) {
        setSolicitudDetalle(s);
        setModalDetalle(true);
    }

    function formatFecha(fecha: string | null): string {
        if (!fecha) return "—";
        return new Date(fecha).toLocaleDateString("es-CR", {
            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
        });
    }

    function getBadgeEstado(estado: string) {
        const map: Record<string, string> = {
            "Pendiente": "badge-warning", "Asignada": "badge-info",
            "En camino": "badge-info", "Atendiendo": "badge-info",
            "Finalizada": "badge-success", "Cancelada": "badge-danger",
        };
        return map[estado] || "badge-info";
    }

    function getDescripcionEstado(estado: string): string {
        const desc: Record<string, string> = {
            "Pendiente": "Su solicitud ha sido recibida y está en espera de asignación.",
            "Asignada": "Se ha asignado una grúa a su solicitud.",
            "En camino": "La grúa se encuentra en camino a su ubicación.",
            "Atendiendo": "El servicio está siendo atendido en este momento.",
            "Finalizada": "El servicio ha sido completado.",
            "Cancelada": "La solicitud fue cancelada.",
        };
        return desc[estado] || "";
    }

    return (
        <div className="page-enter">
            {mensaje && <div className="alert alert-success">{mensaje}</div>}
            {error && !modalCrear && <div className="alert alert-error">{error}</div>}

            <div className="glass-panel" style={{ padding: "20px" }}>
                <div className="panel-header">
                    <h3 className="panel-title">Mis Solicitudes</h3>
                    <button className="btn btn-primary" onClick={() => { setError(""); setModalCrear(true); }}>
                        <Icon name="add" size={18} /> Nueva Solicitud
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">Cargando...</div>
                ) : solicitudes.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">
                        No tiene solicitudes registradas. Cree una nueva solicitud para solicitar un servicio de grúa.
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>N° Servicio</th><th>Origen</th><th>Tipo</th>
                                    <th>Estado</th><th>Fecha</th><th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {solicitudes.map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 500 }}>{s.numero_servicio}</td>
                                        <td>{s.ubicacion_origen}</td>
                                        <td>{s.tipo_servicio}</td>
                                        <td>
                                            <span className={`badge ${getBadgeEstado(s.estado)}`}>
                                                {s.estado}
                                            </span>
                                        </td>
                                        <td className="text-muted">{formatFecha(s.fecha_solicitud)}</td>
                                        <td>
                                            {s.estado === "Finalizada" && !evaluaciones[s.id] && (
                                                <button className="btn btn-ghost btn-sm" onClick={() => abrirModalEvaluar(s)}
                                                    style={{ color: "#f5a623" }}>
                                                    <Icon name="star" size={14} /> Evaluar
                                                </button>
                                            )}
                                            {s.estado === "Finalizada" && evaluaciones[s.id] && (
                                                <span style={{ marginRight: "4px" }}>
                                                    <StarRating value={evaluaciones[s.id].calificacion} readonly size={14} />
                                                </span>
                                            )}
                                            <button className="btn btn-ghost btn-sm" onClick={() => verDetalle(s)}>
                                                <Icon name="chart" size={14} /> Detalle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Nueva Solicitud */}
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

                        <div className="form-group">
                            <label className="form-label">Ubicación de origen *</label>
                            <input className="form-input" value={form.ubicacion_origen}
                                placeholder="¿Dónde se encuentra el vehículo?"
                                onChange={e => setForm({ ...form, ubicacion_origen: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ubicación de destino</label>
                            <input className="form-input" value={form.ubicacion_destino}
                                placeholder="¿A dónde desea llevar el vehículo?"
                                onChange={e => setForm({ ...form, ubicacion_destino: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Descripción del problema</label>
                            <textarea className="form-input" rows={3} value={form.descripcion_problema}
                                placeholder="Describa brevemente la situación..."
                                onChange={e => setForm({ ...form, descripcion_problema: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tipo de servicio</label>
                            <select className="form-select" value={form.tipo_servicio}
                                onChange={e => setForm({ ...form, tipo_servicio: e.target.value })}>
                                <option value="Estándar">Estándar</option>
                                <option value="Urgente">Urgente</option>
                                <option value="Programado">Programado</option>
                            </select>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalCrear(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleCrear}>
                                Enviar Solicitud
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Evaluar Servicio */}
            {modalEvaluar && solicitudEvaluar && (
                <div className="modal-overlay" onClick={() => setModalEvaluar(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Evaluar Servicio {solicitudEvaluar.numero_servicio}</h3>
                            <button className="modal-close" onClick={() => setModalEvaluar(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}

                        <div style={{ textAlign: "center", margin: "20px 0" }}>
                            <p className="text-muted" style={{ marginBottom: "12px" }}>¿Cómo fue su experiencia?</p>
                            <StarRating value={calificacion} onChange={setCalificacion} size={36} />
                            <p style={{ marginTop: "8px", fontWeight: 600, fontSize: "14px" }}>
                                {calificacion === 0 ? "" : ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][calificacion]}
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Comentario (opcional)</label>
                            <textarea className="form-input" rows={3} value={comentario}
                                placeholder="Cuéntenos sobre su experiencia..."
                                onChange={e => setComentario(e.target.value)} />
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalEvaluar(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleEvaluar} disabled={calificacion === 0}>
                                Enviar Evaluación
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Detalle de Solicitud */}
            {modalDetalle && solicitudDetalle && (
                <div className="modal-overlay" onClick={() => setModalDetalle(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Solicitud {solicitudDetalle.numero_servicio}</h3>
                            <button className="modal-close" onClick={() => setModalDetalle(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className={`badge ${getBadgeEstado(solicitudDetalle.estado)}`} style={{ fontSize: "14px", padding: "6px 14px" }}>
                                    {solicitudDetalle.estado}
                                </span>
                                <span className="text-muted" style={{ fontSize: "13px" }}>
                                    {getDescripcionEstado(solicitudDetalle.estado)}
                                </span>
                            </div>

                            <div className="glass-panel" style={{ padding: "14px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "14px" }}>
                                    <div><strong>Origen:</strong> {solicitudDetalle.ubicacion_origen}</div>
                                    <div><strong>Destino:</strong> {solicitudDetalle.ubicacion_destino || "—"}</div>
                                    <div><strong>Tipo:</strong> {solicitudDetalle.tipo_servicio}</div>
                                    <div><strong>Prioridad:</strong> {solicitudDetalle.prioridad}</div>
                                    <div><strong>Grúa:</strong> {solicitudDetalle.camion_placa || "Sin asignar"}</div>
                                    <div><strong>Chofer:</strong> {solicitudDetalle.chofer_nombre || "Sin asignar"}</div>
                                </div>
                            </div>

                            {solicitudDetalle.descripcion_problema && (
                                <div>
                                    <strong style={{ fontSize: "14px" }}>Descripción:</strong>
                                    <p className="text-muted" style={{ margin: "4px 0", fontSize: "14px" }}>
                                        {solicitudDetalle.descripcion_problema}
                                    </p>
                                </div>
                            )}

                            <div style={{ fontSize: "13px" }} className="text-muted">
                                <div>Solicitado: {formatFecha(solicitudDetalle.fecha_solicitud)}</div>
                                {solicitudDetalle.fecha_asignacion && <div>Asignado: {formatFecha(solicitudDetalle.fecha_asignacion)}</div>}
                                {solicitudDetalle.fecha_inicio_servicio && <div>Inicio servicio: {formatFecha(solicitudDetalle.fecha_inicio_servicio)}</div>}
                                {solicitudDetalle.fecha_finalizacion && <div>Finalizado: {formatFecha(solicitudDetalle.fecha_finalizacion)}</div>}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalDetalle(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
