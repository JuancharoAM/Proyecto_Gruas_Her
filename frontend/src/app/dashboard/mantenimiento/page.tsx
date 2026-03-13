"use client";

/**
 * ============================================================================
 * Pagina de Mantenimiento y Combustible
 * ============================================================================
 * Permite seleccionar un camion y ver/registrar mantenimientos y cargas
 * de combustible. Incluye dos tabs: Mantenimiento y Combustible.
 *
 * Funcionalidad clave:
 * - Al crear un mantenimiento con "Bloquear grua" activado, el camion
 *   pasa a estado 'Mantenimiento' y no puede ser operativo.
 * - Al completar el mantenimiento, el camion vuelve a 'Disponible'.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    listarCamiones, listarMantenimientos, crearMantenimiento,
    completarMantenimiento, eliminarMantenimiento,
    listarCombustible, crearCombustible, eliminarCombustible
} from "@/lib/api";
import { Camion, Mantenimiento, Combustible } from "@/types";
import Icon from "@/components/Icon";

type Tab = "mantenimiento" | "combustible";

export default function MantenimientoPage() {
    const searchParams = useSearchParams();
    const [camiones, setCamiones] = useState<Camion[]>([]);
    const [camionSeleccionado, setCamionSeleccionado] = useState<number | null>(null);
    const [tab, setTab] = useState<Tab>("mantenimiento");

    // Mantenimientos
    const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
    const [modalMant, setModalMant] = useState(false);
    const [formMant, setFormMant] = useState({
        tipo: "Preventivo", descripcion: "", costo: "", kilometraje_actual: "",
        fecha_proximo: "", notas: "", bloquear_grua: true,
    });

    // Combustible
    const [combustibles, setCombustibles] = useState<Combustible[]>([]);
    const [modalComb, setModalComb] = useState(false);
    const [formComb, setFormComb] = useState({
        litros: "", costo: "", kilometraje: "", estacion: "",
    });

    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    // Cargar camiones al inicio y preseleccionar si viene por query param
    useEffect(() => {
        (async () => {
            try {
                const res = await listarCamiones();
                if (res.success && res.data) {
                    setCamiones(res.data);
                    // Preseleccionar camion si viene de la pagina de flota
                    const camionId = searchParams.get("camion_id");
                    if (camionId) {
                        setCamionSeleccionado(parseInt(camionId));
                    }
                }
            } catch { setError("Error al cargar camiones."); }
            setLoading(false);
        })();
    }, [searchParams]);

    // Cargar datos al cambiar camion o tab
    useEffect(() => {
        if (!camionSeleccionado) return;
        cargarDatos();
    }, [camionSeleccionado, tab]);

    async function cargarDatos() {
        if (!camionSeleccionado) return;
        setLoading(true);
        try {
            if (tab === "mantenimiento") {
                const res = await listarMantenimientos(camionSeleccionado);
                if (res.success && res.data) setMantenimientos(res.data);
            } else {
                const res = await listarCombustible(camionSeleccionado);
                if (res.success && res.data) setCombustibles(res.data);
            }
            // Recargar camiones para actualizar estado
            const resCam = await listarCamiones();
            if (resCam.success && resCam.data) setCamiones(resCam.data);
        } catch { setError("Error al cargar datos."); }
        setLoading(false);
    }

    // ============ MANTENIMIENTO ============

    function abrirModalMant() {
        setFormMant({ tipo: "Preventivo", descripcion: "", costo: "", kilometraje_actual: "", fecha_proximo: "", notas: "", bloquear_grua: true });
        setError(""); setModalMant(true);
    }

    async function handleGuardarMant() {
        setError("");
        if (!formMant.descripcion) { setError("La descripcion es requerida."); return; }

        try {
            const res = await crearMantenimiento({
                camion_id: camionSeleccionado!,
                tipo: formMant.tipo,
                descripcion: formMant.descripcion,
                costo: formMant.costo ? parseFloat(formMant.costo) : 0,
                kilometraje_actual: formMant.kilometraje_actual ? parseFloat(formMant.kilometraje_actual) : undefined,
                fecha_proximo: formMant.fecha_proximo || undefined,
                notas: formMant.notas || undefined,
                bloquear_grua: formMant.bloquear_grua,
            } as any);
            if (res.success) {
                setMensaje(formMant.bloquear_grua
                    ? "Mantenimiento registrado. Grua bloqueada."
                    : "Mantenimiento registrado.");
                setModalMant(false); cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error al guardar."); }
        } catch { setError("Error de conexion."); }
    }

    async function handleCompletarMant(id: number) {
        try {
            const res = await completarMantenimiento(id);
            if (res.success) {
                setMensaje("Mantenimiento completado. Grua disponible."); cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error al completar."); }
        } catch { setError("Error de conexion."); }
    }

    async function handleEliminarMant(id: number) {
        if (!confirm("Eliminar este registro de mantenimiento?")) return;
        try {
            const res = await eliminarMantenimiento(id);
            if (res.success) {
                setMensaje("Mantenimiento eliminado."); cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            }
        } catch { setError("Error al eliminar."); }
    }

    // ============ COMBUSTIBLE ============

    function abrirModalComb() {
        setFormComb({ litros: "", costo: "", kilometraje: "", estacion: "" });
        setError(""); setModalComb(true);
    }

    async function handleGuardarComb() {
        setError("");
        if (!formComb.litros || !formComb.costo) { setError("Litros y costo son requeridos."); return; }

        try {
            const res = await crearCombustible({
                camion_id: camionSeleccionado!,
                litros: parseFloat(formComb.litros),
                costo: parseFloat(formComb.costo),
                kilometraje: formComb.kilometraje ? parseFloat(formComb.kilometraje) : undefined,
                estacion: formComb.estacion || undefined,
            } as any);
            if (res.success) {
                setMensaje("Carga de combustible registrada."); setModalComb(false); cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error al guardar."); }
        } catch { setError("Error de conexion."); }
    }

    async function handleEliminarComb(id: number) {
        if (!confirm("Eliminar este registro de combustible?")) return;
        try {
            const res = await eliminarCombustible(id);
            if (res.success) {
                setMensaje("Registro eliminado."); cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            }
        } catch { setError("Error al eliminar."); }
    }

    // ============ FORMATEO ============

    function formatFecha(fecha: string) {
        if (!fecha) return "\u2014";
        return new Date(fecha).toLocaleDateString("es-CR", {
            year: "numeric", month: "short", day: "numeric",
        });
    }

    function formatMoneda(monto: number) {
        return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(monto);
    }

    function getEstadoBadge(estado: string) {
        return estado === "En proceso" ? "badge-mantenimiento" : "badge-disponible";
    }

    const camionActual = camiones.find(c => c.id === camionSeleccionado);

    return (
        <div className="page-enter">
            {mensaje && <div className="alert alert-success">{mensaje}</div>}
            {error && !modalMant && !modalComb && <div className="alert alert-error">{error}</div>}

            {/* Selector de camion */}
            <div className="glass-panel" style={{ padding: "20px", marginBottom: "16px" }}>
                <div className="panel-header">
                    <h3 className="panel-title"><Icon name="wrench" size={22} /> Mantenimiento y Combustible</h3>
                </div>
                <div className="form-group" style={{ maxWidth: "400px", marginTop: "12px" }}>
                    <label className="form-label">Seleccionar Camion</label>
                    <select className="form-select" value={camionSeleccionado || ""}
                        onChange={e => setCamionSeleccionado(e.target.value ? parseInt(e.target.value) : null)}>
                        <option value="">— Seleccione un camion —</option>
                        {camiones.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.placa} — {c.marca} {c.modelo} ({c.estado})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Contenido si hay camion seleccionado */}
            {camionSeleccionado && (
                <>
                    {/* Info del camion */}
                    <div className="glass-panel" style={{ padding: "16px", marginBottom: "16px" }}>
                        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "14px", alignItems: "center" }}>
                            <div><strong>Placa:</strong> {camionActual?.placa}</div>
                            <div><strong>Tipo:</strong> {camionActual?.tipo_grua_nombre}</div>
                            <div><strong>Km:</strong> {camionActual?.kilometraje?.toLocaleString() || 0}</div>
                            <div>
                                <strong>Estado:</strong>{" "}
                                <span className={`badge ${camionActual?.estado === "Disponible" ? "badge-disponible" : camionActual?.estado === "Mantenimiento" ? "badge-mantenimiento" : "badge-info"}`}>
                                    {camionActual?.estado}
                                </span>
                            </div>
                            <div><strong>Chofer:</strong> {camionActual?.chofer_nombre || "Sin asignar"}</div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                        <button className={`btn ${tab === "mantenimiento" ? "btn-primary" : "btn-ghost"}`}
                            onClick={() => setTab("mantenimiento")}>
                            <Icon name="wrench" size={16} /> Mantenimiento
                        </button>
                        <button className={`btn ${tab === "combustible" ? "btn-primary" : "btn-ghost"}`}
                            onClick={() => setTab("combustible")}>
                            <Icon name="fuel" size={16} /> Combustible
                        </button>
                    </div>

                    {/* Tab Mantenimiento */}
                    {tab === "mantenimiento" && (
                        <div className="glass-panel" style={{ padding: "20px" }}>
                            <div className="panel-header">
                                <h3 className="panel-title">Historial de Mantenimiento ({mantenimientos.length})</h3>
                                <button className="btn btn-primary" onClick={abrirModalMant}>
                                    <Icon name="add" size={18} /> Registrar
                                </button>
                            </div>

                            {loading ? (
                                <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">Cargando...</div>
                            ) : mantenimientos.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Fecha</th><th>Tipo</th><th>Estado</th><th>Descripcion</th>
                                                <th>Costo</th><th>Km</th>
                                                <th>Realizado por</th><th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mantenimientos.map(m => (
                                                <tr key={m.id}>
                                                    <td>{formatFecha(m.fecha_mantenimiento)}</td>
                                                    <td>
                                                        <span className={`badge ${m.tipo === "Preventivo" ? "badge-disponible" : "badge-en-servicio"}`}>
                                                            {m.tipo}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getEstadoBadge(m.estado)}`}>
                                                            {m.estado}
                                                        </span>
                                                    </td>
                                                    <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {m.descripcion}
                                                    </td>
                                                    <td>{formatMoneda(m.costo)}</td>
                                                    <td>{m.kilometraje_actual ? `${m.kilometraje_actual.toLocaleString()} km` : "\u2014"}</td>
                                                    <td>{m.realizado_por_nombre}</td>
                                                    <td style={{ display: "flex", gap: "4px" }}>
                                                        {m.estado === "En proceso" && (
                                                            <button className="btn btn-ghost btn-sm" style={{ color: "var(--color-success)" }}
                                                                onClick={() => handleCompletarMant(m.id)}
                                                                title="Completar mantenimiento">
                                                                <Icon name="check" size={14} /> Completar
                                                            </button>
                                                        )}
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleEliminarMant(m.id)}
                                                            title="Eliminar registro">
                                                            <Icon name="close" size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-muted" style={{ padding: "40px" }}>
                                    <Icon name="wrench" size={40} />
                                    <p className="mt-1">No hay mantenimientos registrados para este camion.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab Combustible */}
                    {tab === "combustible" && (
                        <div className="glass-panel" style={{ padding: "20px" }}>
                            <div className="panel-header">
                                <h3 className="panel-title">Registro de Combustible ({combustibles.length})</h3>
                                <button className="btn btn-primary" onClick={abrirModalComb}>
                                    <Icon name="add" size={18} /> Registrar
                                </button>
                            </div>

                            {loading ? (
                                <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">Cargando...</div>
                            ) : combustibles.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Fecha</th><th>Litros</th><th>Costo</th>
                                                <th>Km</th><th>Estacion</th>
                                                <th>Registrado por</th><th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {combustibles.map(cb => (
                                                <tr key={cb.id}>
                                                    <td>{formatFecha(cb.fecha)}</td>
                                                    <td>{cb.litros} L</td>
                                                    <td>{formatMoneda(cb.costo)}</td>
                                                    <td>{cb.kilometraje ? `${cb.kilometraje.toLocaleString()} km` : "\u2014"}</td>
                                                    <td>{cb.estacion || "\u2014"}</td>
                                                    <td>{cb.registrado_por_nombre}</td>
                                                    <td>
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleEliminarComb(cb.id)}>
                                                            <Icon name="close" size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-muted" style={{ padding: "40px" }}>
                                    <Icon name="fuel" size={40} />
                                    <p className="mt-1">No hay registros de combustible para este camion.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Sin seleccion */}
            {!camionSeleccionado && !loading && (
                <div className="glass-panel" style={{ padding: "60px", textAlign: "center" }}>
                    <Icon name="truck" size={48} />
                    <p className="text-muted mt-1">Seleccione un camion para ver su historial de mantenimiento y combustible.</p>
                </div>
            )}

            {/* Modal: Registrar Mantenimiento */}
            {modalMant && (
                <div className="modal-overlay" onClick={() => setModalMant(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Registrar Mantenimiento</h3>
                            <button className="modal-close" onClick={() => setModalMant(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}
                        <div className="form-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                            <div className="form-group">
                                <label className="form-label">Tipo *</label>
                                <select className="form-select" value={formMant.tipo}
                                    onChange={e => setFormMant({ ...formMant, tipo: e.target.value })}>
                                    <option value="Preventivo">Preventivo</option>
                                    <option value="Correctivo">Correctivo</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Costo</label>
                                <input className="form-input" type="number" step="0.01" value={formMant.costo}
                                    onChange={e => setFormMant({ ...formMant, costo: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Kilometraje actual</label>
                                <input className="form-input" type="number" value={formMant.kilometraje_actual}
                                    onChange={e => setFormMant({ ...formMant, kilometraje_actual: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Proximo mantenimiento</label>
                                <input className="form-input" type="date" value={formMant.fecha_proximo}
                                    onChange={e => setFormMant({ ...formMant, fecha_proximo: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Descripcion *</label>
                            <textarea className="form-textarea" value={formMant.descripcion}
                                onChange={e => setFormMant({ ...formMant, descripcion: e.target.value })}
                                placeholder="Descripcion del trabajo a realizar..." rows={3} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notas</label>
                            <textarea className="form-textarea" value={formMant.notas}
                                onChange={e => setFormMant({ ...formMant, notas: e.target.value })}
                                placeholder="Notas adicionales..." rows={2} />
                        </div>
                        <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)" }}>
                            <input type="checkbox" id="bloquear_grua" checked={formMant.bloquear_grua}
                                onChange={e => setFormMant({ ...formMant, bloquear_grua: e.target.checked })}
                                style={{ width: "18px", height: "18px", accentColor: "var(--color-primary)" }} />
                            <label htmlFor="bloquear_grua" style={{ cursor: "pointer", fontSize: "14px" }}>
                                <strong>Bloquear grua</strong> — La grua pasara a estado &quot;Mantenimiento&quot; y no podra ser asignada a servicios hasta completar este mantenimiento.
                            </label>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalMant(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleGuardarMant}>Registrar Mantenimiento</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Registrar Combustible */}
            {modalComb && (
                <div className="modal-overlay" onClick={() => setModalComb(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Registrar Carga de Combustible</h3>
                            <button className="modal-close" onClick={() => setModalComb(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}
                        <div className="form-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                            <div className="form-group">
                                <label className="form-label">Litros *</label>
                                <input className="form-input" type="number" step="0.01" value={formComb.litros}
                                    onChange={e => setFormComb({ ...formComb, litros: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Costo *</label>
                                <input className="form-input" type="number" step="0.01" value={formComb.costo}
                                    onChange={e => setFormComb({ ...formComb, costo: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Kilometraje</label>
                                <input className="form-input" type="number" value={formComb.kilometraje}
                                    onChange={e => setFormComb({ ...formComb, kilometraje: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Estacion</label>
                                <input className="form-input" value={formComb.estacion}
                                    onChange={e => setFormComb({ ...formComb, estacion: e.target.value })}
                                    placeholder="Nombre de la gasolinera" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalComb(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleGuardarComb}>Registrar Carga</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
