"use client";

/**
 * ============================================================================
 * Página de Gestión de Flota (Camiones/Grúas)
 * ============================================================================
 * CRUD de camiones con tabla, modal crear/editar, y badges de estado.
 * ============================================================================
 */

import { useEffect, useState, useMemo } from "react";
import { listarCamiones, crearCamion, actualizarCamion, listarTiposGrua, listarUsuarios } from "@/lib/api";
import { Camion, TipoGrua, UsuarioCompleto } from "@/types";
import Icon from "@/components/Icon";

export default function CamionesPage() {
    const [camiones, setCamiones] = useState<Camion[]>([]);
    const [tiposGrua, setTiposGrua] = useState<TipoGrua[]>([]);
    const [choferes, setChoferes] = useState<UsuarioCompleto[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState<Camion | null>(null);
    const [form, setForm] = useState({
        placa: "", marca: "", modelo: "", anio: "", color: "",
        tipo_grua_id: "", kilometraje: "", capacidad_toneladas: "", chofer_asignado_id: "", notas: "",
    });
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    async function cargarDatos() {
        setLoading(true);
        try {
            const [resCamiones, resTipos, resUsuarios] = await Promise.all([listarCamiones(), listarTiposGrua(), listarUsuarios()]);
            if (resCamiones.success && resCamiones.data) setCamiones(resCamiones.data);
            if (resTipos.success && resTipos.data) setTiposGrua(resTipos.data);
            if (resUsuarios.success && resUsuarios.data) setChoferes(resUsuarios.data.filter(u => u.rol_nombre === "Chofer" && u.activo));
        } catch { setError("Error al cargar datos."); }
        setLoading(false);
    }

    useEffect(() => { cargarDatos(); }, []);

    /** Mapa de chofer_id → placa del camión al que ya está asignado (excluyendo el que se edita) */
    const choferAsignadoA = useMemo(() => {
        const mapa: Record<number, string> = {};
        camiones.forEach(c => {
            if (c.chofer_asignado_id && (!editando || c.id !== editando.id)) {
                mapa[c.chofer_asignado_id] = c.placa;
            }
        });
        return mapa;
    }, [camiones, editando]);

    function abrirModalCrear() {
        setEditando(null);
        setForm({ placa: "", marca: "", modelo: "", anio: "", color: "",
            tipo_grua_id: tiposGrua[0]?.id.toString() || "", kilometraje: "0",
            capacidad_toneladas: "", chofer_asignado_id: "", notas: "" });
        setError(""); setModalAbierto(true);
    }

    function abrirModalEditar(camion: Camion) {
        setEditando(camion);
        setForm({
            placa: camion.placa, marca: camion.marca || "", modelo: camion.modelo || "",
            anio: camion.anio?.toString() || "", color: camion.color || "",
            tipo_grua_id: camion.tipo_grua_id?.toString() || "",
            kilometraje: camion.kilometraje?.toString() || "0",
            capacidad_toneladas: camion.capacidad_toneladas?.toString() || "",
            chofer_asignado_id: camion.chofer_asignado_id?.toString() || "",
            notas: camion.notas || "",
        });
        setError(""); setModalAbierto(true);
    }

    async function handleGuardar() {
        setError("");
        if (!form.placa || !form.tipo_grua_id) {
            setError("La placa y el tipo de grúa son requeridos."); return;
        }
        const datos: any = {
            placa: form.placa, marca: form.marca, modelo: form.modelo,
            anio: form.anio ? parseInt(form.anio) : null, color: form.color,
            tipo_grua_id: parseInt(form.tipo_grua_id),
            kilometraje: parseFloat(form.kilometraje) || 0,
            capacidad_toneladas: form.capacidad_toneladas ? parseFloat(form.capacidad_toneladas) : null,
            chofer_asignado_id: form.chofer_asignado_id ? parseInt(form.chofer_asignado_id) : null,
            notas: form.notas,
        };
        try {
            const res = editando ? await actualizarCamion(editando.id, datos) : await crearCamion(datos);
            if (res.success) {
                setMensaje(editando ? "Camión actualizado." : "Camión registrado.");
                setModalAbierto(false); cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error al guardar."); }
        } catch { setError("Error de conexión."); }
    }

    function getBadgeClass(estado: string): string {
        const map: Record<string, string> = {
            "Disponible": "badge-disponible", "En servicio": "badge-en-servicio",
            "Mantenimiento": "badge-mantenimiento", "Fuera de servicio": "badge-fuera-servicio",
        };
        return map[estado] || "badge-info";
    }

    return (
        <div className="page-enter">
            {mensaje && <div className="alert alert-success">{mensaje}</div>}
            {error && !modalAbierto && <div className="alert alert-error">{error}</div>}

            <div className="glass-panel" style={{ padding: "20px" }}>
                <div className="panel-header">
                    <h3 className="panel-title">Flota de Grúas ({camiones.length})</h3>
                    <button className="btn btn-primary" onClick={abrirModalCrear}>
                        <Icon name="add" size={18} /> Registrar Camión
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">Cargando...</div>
                ) : camiones.length > 0 ? (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Placa</th><th>Marca / Modelo</th><th>Tipo</th>
                                    <th>Año</th><th>Km</th><th>Chofer</th>
                                    <th>Estado</th><th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {camiones.map(c => (
                                    <tr key={c.id}>
                                        <td style={{ fontWeight: 600 }}>{c.placa}</td>
                                        <td>{c.marca} {c.modelo}</td>
                                        <td>{c.tipo_grua_nombre}</td>
                                        <td>{c.anio || "—"}</td>
                                        <td>{c.kilometraje?.toLocaleString() || "0"} km</td>
                                        <td>{c.chofer_nombre || "Sin asignar"}</td>
                                        <td><span className={`badge ${getBadgeClass(c.estado)}`}>{c.estado}</span></td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" onClick={() => abrirModalEditar(c)}>
                                                <Icon name="edit" size={14} /> Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center text-muted" style={{ padding: "40px" }}>
                        <Icon name="truck" size={40} />
                        <p className="mt-1">No hay camiones registrados.</p>
                        <button className="btn btn-primary btn-sm mt-2" onClick={abrirModalCrear}>
                            <Icon name="add" size={16} /> Registrar primero
                        </button>
                    </div>
                )}
            </div>

            {/* Modal: Crear/Editar Camión */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editando ? `Editar: ${editando.placa}` : "Registrar Nuevo Camión"}</h3>
                            <button className="modal-close" onClick={() => setModalAbierto(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}
                        <div className="form-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                            <div className="form-group">
                                <label className="form-label">Placa *</label>
                                <input className="form-input" value={form.placa}
                                    onChange={e => setForm({ ...form, placa: e.target.value.toUpperCase() })} placeholder="ABC-123" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tipo de grúa *</label>
                                <select className="form-select" value={form.tipo_grua_id}
                                    onChange={e => setForm({ ...form, tipo_grua_id: e.target.value })}>
                                    <option value="">Seleccione</option>
                                    {tiposGrua.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Marca</label>
                                <input className="form-input" value={form.marca}
                                    onChange={e => setForm({ ...form, marca: e.target.value })} placeholder="Hino, Isuzu..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Modelo</label>
                                <input className="form-input" value={form.modelo}
                                    onChange={e => setForm({ ...form, modelo: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Año</label>
                                <input className="form-input" type="number" value={form.anio}
                                    onChange={e => setForm({ ...form, anio: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Color</label>
                                <input className="form-input" value={form.color}
                                    onChange={e => setForm({ ...form, color: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Kilometraje</label>
                                <input className="form-input" type="number" value={form.kilometraje}
                                    onChange={e => setForm({ ...form, kilometraje: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Capacidad (ton)</label>
                                <input className="form-input" type="number" step="0.1" value={form.capacidad_toneladas}
                                    onChange={e => setForm({ ...form, capacidad_toneladas: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Chofer Asignado</label>
                            <select className="form-select" value={form.chofer_asignado_id}
                                onChange={e => setForm({ ...form, chofer_asignado_id: e.target.value })}>
                                <option value="">— Sin asignar —</option>
                                {choferes.map(ch => {
                                    const asignadoA = choferAsignadoA[ch.id];
                                    return (
                                        <option key={ch.id} value={ch.id} disabled={!!asignadoA}>
                                            {ch.nombre}{asignadoA ? ` (Asignado a ${asignadoA})` : ""}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notas</label>
                            <textarea className="form-textarea" value={form.notas}
                                onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Notas adicionales" />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalAbierto(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleGuardar}>
                                {editando ? "Guardar Cambios" : "Registrar Camión"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
