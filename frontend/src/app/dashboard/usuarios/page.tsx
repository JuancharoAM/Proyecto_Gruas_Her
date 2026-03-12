"use client";

/**
 * ============================================================================
 * Página de Gestión de Usuarios (Solo Administrador)
 * ============================================================================
 * CRUD de usuarios con roles, activación/desactivación.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { listarUsuarios, crearUsuario, actualizarUsuario, desactivarUsuario, activarUsuario, listarRoles, crearChoferDirecto } from "@/lib/api";
import { UsuarioCompleto, Rol } from "@/types";
import Icon from "@/components/Icon";

export default function UsuariosPage() {
    const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
    const [roles, setRoles] = useState<Rol[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalChoferAbierto, setModalChoferAbierto] = useState(false);
    const [editando, setEditando] = useState<UsuarioCompleto | null>(null);
    const [form, setForm] = useState({ nombre: "", email: "", password: "", rol_id: "" });
    const [choferForm, setChoferForm] = useState({ nombre: "", email: "", password: "" });
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    async function cargarDatos() {
        setLoading(true);
        try {
            const [resU, resR] = await Promise.all([listarUsuarios(), listarRoles()]);
            if (resU.success && resU.data) setUsuarios(resU.data);
            if (resR.success && resR.data) setRoles(resR.data);
        } catch { setError("Error al cargar datos."); }
        setLoading(false);
    }

    useEffect(() => { cargarDatos(); }, []);

    function abrirCrear() {
        setEditando(null);
        setForm({ nombre: "", email: "", password: "", rol_id: roles[0]?.id.toString() || "" });
        setError(""); setModalAbierto(true);
    }

    function abrirCrearChofer() {
        setChoferForm({ nombre: "", email: "", password: "" });
        setError(""); setModalChoferAbierto(true);
    }

    function abrirEditar(u: UsuarioCompleto) {
        setEditando(u);
        setForm({ nombre: u.nombre, email: u.email, password: "", rol_id: u.rol_id.toString() });
        setError(""); setModalAbierto(true);
    }

    async function handleGuardar() {
        setError("");
        if (!form.nombre || !form.email || (!editando && !form.password)) {
            setError("Nombre, email y contraseña son requeridos."); return;
        }
        try {
            let res;
            if (editando) {
                const datos: any = { nombre: form.nombre, email: form.email, rol_id: parseInt(form.rol_id) };
                if (form.password) datos.password = form.password;
                res = await actualizarUsuario(editando.id, datos);
            } else {
                res = await crearUsuario({ nombre: form.nombre, email: form.email,
                    password: form.password, rol_id: parseInt(form.rol_id) });
            }
            if (res.success) {
                setMensaje(editando ? "Usuario actualizado." : "Usuario creado.");
                setModalAbierto(false); cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error al guardar."); }
        } catch { setError("Error de conexión."); }
    }

    async function handleGuardarChofer() {
        setError("");
        if (!choferForm.nombre || !choferForm.email || !choferForm.password) {
            setError("Todos los campos son requeridos."); return;
        }
        try {
            const res = await crearChoferDirecto(choferForm);
            if (res.success) {
                setMensaje("Chofer registrado exitosamente.");
                setModalChoferAbierto(false); cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error al registrar chofer."); }
        } catch { setError("Error de conexión."); }
    }

    async function handleDesactivar(id: number, nombre: string) {
        if (!confirm(`¿Desea desactivar al usuario "${nombre}"?`)) return;
        try {
            const res = await desactivarUsuario(id);
            if (res.success) {
                setMensaje("Usuario desactivado."); cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            }
        } catch { setError("Error al desactivar."); }
    }

    async function handleActivar(id: number, nombre: string) {
        if (!confirm(`¿Desea activar al usuario "${nombre}"?`)) return;
        try {
            const res = await activarUsuario(id);
            if (res.success) {
                setMensaje("Usuario activado."); cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            }
        } catch { setError("Error al activar."); }
    }

    function formatFecha(fecha: string | null): string {
        if (!fecha) return "Nunca";
        return new Date(fecha).toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" });
    }

    return (
        <div className="page-enter">
            {mensaje && <div className="alert alert-success">{mensaje}</div>}
            {error && !modalAbierto && <div className="alert alert-error">{error}</div>}

            <div className="glass-panel" style={{ padding: "20px" }}>
                <div className="panel-header">
                    <h3 className="panel-title">Usuarios del Sistema ({usuarios.length})</h3>
                    <div className="flex gap-1">
                        <button className="btn btn-ghost" onClick={abrirCrearChofer}>
                            <Icon name="truck" size={18} /> Registrar Chofer
                        </button>
                        <button className="btn btn-primary" onClick={abrirCrear}>
                            <Icon name="add" size={18} /> Nuevo Usuario
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
                                    <th>Nombre</th><th>Email</th><th>Rol</th>
                                    <th>Estado</th><th>Último acceso</th><th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map(u => (
                                    <tr key={u.id}>
                                        <td style={{ fontWeight: 500 }}>{u.nombre}</td>
                                        <td>{u.email}</td>
                                        <td><span className="badge badge-info">{u.rol_nombre}</span></td>
                                        <td>
                                            <span className={`badge ${u.activo ? "badge-success" : "badge-danger"}`}>
                                                {u.activo ? "Activo" : "Inactivo"}
                                            </span>
                                        </td>
                                        <td className="text-muted">{formatFecha(u.ultimo_acceso)}</td>
                                        <td>
                                            <div className="flex gap-1">
                                                <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(u)}>
                                                    <Icon name="edit" size={14} /> Editar
                                                </button>
                                                {u.activo ? (
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleDesactivar(u.id, u.nombre)}>
                                                        Desactivar
                                                    </button>
                                                ) : (
                                                    <button className="btn btn-success btn-sm" onClick={() => handleActivar(u.id, u.nombre)}>
                                                        Activar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Crear/Editar Usuario */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editando ? `Editar: ${editando.nombre}` : "Nuevo Usuario"}</h3>
                            <button className="modal-close" onClick={() => setModalAbierto(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}
                        <div className="form-group">
                            <label className="form-label">Nombre completo *</label>
                            <input className="form-input" value={form.nombre}
                                onChange={e => setForm({ ...form, nombre: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Correo electrónico *</label>
                            <input className="form-input" type="email" value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">
                                Contraseña {editando ? "(dejar vacío para no cambiar)" : "*"}
                            </label>
                            <input className="form-input" type="password" value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rol *</label>
                            <select className="form-select" value={form.rol_id}
                                onChange={e => setForm({ ...form, rol_id: e.target.value })}>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                            </select>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalAbierto(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleGuardar}>
                                {editando ? "Guardar Cambios" : "Crear Usuario"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Crear Chofer Rápido */}
            {modalChoferAbierto && (
                <div className="modal-overlay" onClick={() => setModalChoferAbierto(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Registro Rápido de Chofer</h3>
                            <button className="modal-close" onClick={() => setModalChoferAbierto(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && !modalAbierto && <div className="alert alert-error">{error}</div>}
                        <p className="text-muted" style={{marginBottom: "1rem", fontSize: "0.9rem"}}>
                            Crea una cuenta para un chofer. Se le asignará el rol &quot;Chofer&quot; automáticamente.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Nombre del chofer *</label>
                            <input className="form-input" value={choferForm.nombre}
                                onChange={e => setChoferForm({ ...choferForm, nombre: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Correo electrónico *</label>
                            <input className="form-input" type="email" value={choferForm.email}
                                onChange={e => setChoferForm({ ...choferForm, email: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contraseña (temporal) *</label>
                            <input className="form-input" type="password" value={choferForm.password}
                                onChange={e => setChoferForm({ ...choferForm, password: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalChoferAbierto(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleGuardarChofer}>
                                Registrar Chofer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
