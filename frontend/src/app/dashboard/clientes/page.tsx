"use client";

/**
 * ============================================================================
 * Página de Gestión de Clientes (Administrador y Logística)
 * ============================================================================
 * CRUD de clientes con creación opcional de usuario, historial de solicitudes.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import {
    listarClientes, crearCliente, actualizarCliente,
    desactivarCliente, activarCliente, obtenerHistorialCliente
} from "@/lib/api";
import { Cliente, Solicitud } from "@/types";
import Icon from "@/components/Icon";

export default function ClientesPage() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalHistorial, setModalHistorial] = useState(false);
    const [editando, setEditando] = useState<Cliente | null>(null);
    const [historial, setHistorial] = useState<Solicitud[]>([]);
    const [clienteHistorial, setClienteHistorial] = useState<Cliente | null>(null);
    const [form, setForm] = useState({
        cedula: "", nombre: "", apellido: "", telefono: "",
        correo: "", notas: "", crear_usuario: false, password: ""
    });
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [busqueda, setBusqueda] = useState("");

    async function cargarDatos() {
        setLoading(true);
        try {
            const res = await listarClientes();
            if (res.success && res.data) setClientes(res.data);
        } catch { setError("Error al cargar clientes."); }
        setLoading(false);
    }

    useEffect(() => { cargarDatos(); }, []);

    function abrirCrear() {
        setEditando(null);
        setForm({ cedula: "", nombre: "", apellido: "", telefono: "", correo: "", notas: "", crear_usuario: false, password: "" });
        setError(""); setModalAbierto(true);
    }

    function abrirEditar(c: Cliente) {
        setEditando(c);
        setForm({
            cedula: c.cedula, nombre: c.nombre, apellido: c.apellido,
            telefono: c.telefono || "", correo: c.correo || "",
            notas: c.notas || "", crear_usuario: false, password: ""
        });
        setError(""); setModalAbierto(true);
    }

    async function abrirHistorial(c: Cliente) {
        setClienteHistorial(c);
        setHistorial([]);
        setModalHistorial(true);
        try {
            const res = await obtenerHistorialCliente(c.id);
            if (res.success && res.data) setHistorial(res.data);
        } catch { /* silenciar */ }
    }

    async function handleGuardar() {
        setError("");
        if (!form.cedula || !form.nombre || !form.apellido) {
            setError("Cédula, nombre y apellido son requeridos."); return;
        }
        if (!editando && form.crear_usuario && !form.password) {
            setError("La contraseña es requerida para crear el usuario."); return;
        }
        if (!editando && form.crear_usuario && !form.correo) {
            setError("El correo es requerido para crear el usuario."); return;
        }
        try {
            let res;
            if (editando) {
                res = await actualizarCliente(editando.id, {
                    cedula: form.cedula, nombre: form.nombre, apellido: form.apellido,
                    telefono: form.telefono || undefined, correo: form.correo || undefined,
                    notas: form.notas || undefined,
                } as Partial<Cliente>);
            } else {
                res = await crearCliente({
                    cedula: form.cedula, nombre: form.nombre, apellido: form.apellido,
                    telefono: form.telefono || undefined, correo: form.correo || undefined,
                    notas: form.notas || undefined,
                    crear_usuario: form.crear_usuario, password: form.password || undefined,
                });
            }
            if (res.success) {
                setMensaje(editando ? "Cliente actualizado." : "Cliente registrado.");
                setModalAbierto(false); cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error al guardar."); }
        } catch { setError("Error de conexión."); }
    }

    async function handleDesactivar(id: number, nombre: string) {
        if (!confirm(`¿Desea desactivar al cliente "${nombre}"?`)) return;
        try {
            const res = await desactivarCliente(id);
            if (res.success) {
                setMensaje("Cliente desactivado."); cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            }
        } catch { setError("Error al desactivar."); }
    }

    async function handleActivar(id: number, nombre: string) {
        if (!confirm(`¿Desea activar al cliente "${nombre}"?`)) return;
        try {
            const res = await activarCliente(id);
            if (res.success) {
                setMensaje("Cliente activado."); cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            }
        } catch { setError("Error al activar."); }
    }

    function formatFecha(fecha: string | null): string {
        if (!fecha) return "—";
        return new Date(fecha).toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" });
    }

    const clientesFiltrados = clientes.filter(c => {
        const texto = busqueda.toLowerCase();
        return c.nombre.toLowerCase().includes(texto) ||
            c.apellido.toLowerCase().includes(texto) ||
            c.cedula.toLowerCase().includes(texto) ||
            (c.correo && c.correo.toLowerCase().includes(texto)) ||
            (c.telefono && c.telefono.includes(texto));
    });

    function getBadgeEstado(estado: string) {
        const map: Record<string, string> = {
            "Pendiente": "badge-warning", "Asignada": "badge-info",
            "En camino": "badge-info", "Atendiendo": "badge-info",
            "Finalizada": "badge-success", "Cancelada": "badge-danger",
        };
        return map[estado] || "badge-info";
    }

    return (
        <div className="page-enter">
            {mensaje && <div className="alert alert-success">{mensaje}</div>}
            {error && !modalAbierto && <div className="alert alert-error">{error}</div>}

            <div className="glass-panel" style={{ padding: "20px" }}>
                <div className="panel-header">
                    <h3 className="panel-title">Clientes ({clientesFiltrados.length})</h3>
                    <div className="flex gap-1">
                        <input
                            className="form-input"
                            placeholder="Buscar por nombre, cédula, correo..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            style={{ maxWidth: "280px" }}
                        />
                        <button className="btn btn-primary" onClick={abrirCrear}>
                            <Icon name="add" size={18} /> Nuevo Cliente
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">Cargando...</div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Cédula</th><th>Nombre</th><th>Teléfono</th>
                                    <th>Correo</th><th>Estado</th><th>Solicitudes</th>
                                    <th>Usuario</th><th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientesFiltrados.map(c => (
                                    <tr key={c.id}>
                                        <td style={{ fontWeight: 500 }}>{c.cedula}</td>
                                        <td>{c.nombre} {c.apellido}</td>
                                        <td>{c.telefono || "—"}</td>
                                        <td>{c.correo || "—"}</td>
                                        <td>
                                            <span className={`badge ${c.activo ? "badge-success" : "badge-danger"}`}>
                                                {c.activo ? "Activo" : "Inactivo"}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" onClick={() => abrirHistorial(c)}
                                                title="Ver historial de solicitudes">
                                                {c.total_solicitudes}
                                            </button>
                                        </td>
                                        <td>
                                            {c.usuario_email ? (
                                                <span className="badge badge-info" title={c.usuario_email}>
                                                    Sí
                                                </span>
                                            ) : (
                                                <span className="text-muted">No</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex gap-1">
                                                <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(c)}>
                                                    <Icon name="edit" size={14} /> Editar
                                                </button>
                                                {c.activo ? (
                                                    <button className="btn btn-danger btn-sm"
                                                        onClick={() => handleDesactivar(c.id, `${c.nombre} ${c.apellido}`)}>
                                                        Desactivar
                                                    </button>
                                                ) : (
                                                    <button className="btn btn-success btn-sm"
                                                        onClick={() => handleActivar(c.id, `${c.nombre} ${c.apellido}`)}>
                                                        Activar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {clientesFiltrados.length === 0 && (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: "center", padding: "30px" }} className="text-muted">
                                            {busqueda ? "No se encontraron clientes con esa búsqueda." : "No hay clientes registrados."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Crear/Editar Cliente */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editando ? `Editar: ${editando.nombre} ${editando.apellido}` : "Nuevo Cliente"}
                            </h3>
                            <button className="modal-close" onClick={() => setModalAbierto(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                            <div className="form-group">
                                <label className="form-label">Cédula *</label>
                                <input className="form-input" value={form.cedula}
                                    onChange={e => setForm({ ...form, cedula: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Teléfono</label>
                                <input className="form-input" value={form.telefono}
                                    onChange={e => setForm({ ...form, telefono: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nombre *</label>
                                <input className="form-input" value={form.nombre}
                                    onChange={e => setForm({ ...form, nombre: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Apellido *</label>
                                <input className="form-input" value={form.apellido}
                                    onChange={e => setForm({ ...form, apellido: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Correo electrónico</label>
                            <input className="form-input" type="email" value={form.correo}
                                onChange={e => setForm({ ...form, correo: e.target.value })} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notas</label>
                            <textarea className="form-input" rows={2} value={form.notas}
                                onChange={e => setForm({ ...form, notas: e.target.value })} />
                        </div>

                        {!editando && (
                            <>
                                <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <input type="checkbox" id="crear_usuario"
                                        checked={form.crear_usuario}
                                        onChange={e => setForm({ ...form, crear_usuario: e.target.checked })} />
                                    <label htmlFor="crear_usuario" className="form-label" style={{ margin: 0 }}>
                                        Crear usuario para que el cliente pueda iniciar sesión
                                    </label>
                                </div>
                                {form.crear_usuario && (
                                    <div className="form-group">
                                        <label className="form-label">Contraseña (temporal) *</label>
                                        <input className="form-input" type="password" value={form.password}
                                            onChange={e => setForm({ ...form, password: e.target.value })} />
                                        <small className="text-muted">
                                            El correo electrónico será utilizado como credencial de acceso.
                                        </small>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalAbierto(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleGuardar}>
                                {editando ? "Guardar Cambios" : "Registrar Cliente"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Historial de Solicitudes */}
            {modalHistorial && clienteHistorial && (
                <div className="modal-overlay" onClick={() => setModalHistorial(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "700px" }}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                Historial: {clienteHistorial.nombre} {clienteHistorial.apellido}
                            </h3>
                            <button className="modal-close" onClick={() => setModalHistorial(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>

                        {historial.length === 0 ? (
                            <div style={{ padding: "30px", textAlign: "center" }} className="text-muted">
                                Este cliente no tiene solicitudes registradas.
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>N° Servicio</th><th>Origen</th>
                                            <th>Estado</th><th>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historial.map(s => (
                                            <tr key={s.id}>
                                                <td style={{ fontWeight: 500 }}>{s.numero_servicio}</td>
                                                <td>{s.ubicacion_origen}</td>
                                                <td>
                                                    <span className={`badge ${getBadgeEstado(s.estado)}`}>
                                                        {s.estado}
                                                    </span>
                                                </td>
                                                <td className="text-muted">{formatFecha(s.fecha_solicitud)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalHistorial(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
