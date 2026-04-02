"use client";

import { useEffect, useState } from "react";
import {
    listarFacturas, crearFactura, marcarFacturaPagada, anularFactura,
    obtenerResumenFacturas, listarSolicitudesSinFactura
} from "@/lib/api";
import { Factura, ResumenFacturas, SolicitudFacturable } from "@/types";
import Icon from "@/components/Icon";

export default function FacturacionPage() {
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [resumen, setResumen] = useState<ResumenFacturas | null>(null);
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState("");
    const [modalCrear, setModalCrear] = useState(false);
    const [solicitudesDisponibles, setSolicitudesDisponibles] = useState<SolicitudFacturable[]>([]);
    const [form, setForm] = useState({ solicitud_id: 0, subtotal: "", descripcion: "", notas: "" });
    const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudFacturable | null>(null);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    async function cargarDatos() {
        setLoading(true);
        try {
            const [resFact, resResumen] = await Promise.all([
                listarFacturas(filtroEstado || undefined),
                obtenerResumenFacturas(),
            ]);
            if (resFact.success && resFact.data) setFacturas(resFact.data);
            if (resResumen.success && resResumen.data) setResumen(resResumen.data);
        } catch { setError("Error al cargar datos."); }
        setLoading(false);
    }

    useEffect(() => { cargarDatos(); }, [filtroEstado]);

    async function abrirModalCrear() {
        setError("");
        try {
            const res = await listarSolicitudesSinFactura();
            if (res.success && res.data) setSolicitudesDisponibles(res.data);
        } catch { /* empty */ }
        setForm({ solicitud_id: 0, subtotal: "", descripcion: "", notas: "" });
        setSolicitudSeleccionada(null);
        setModalCrear(true);
    }

    function seleccionarSolicitud(id: number) {
        const sol = solicitudesDisponibles.find(s => s.id === id) || null;
        setSolicitudSeleccionada(sol);
        setForm({ ...form, solicitud_id: id, descripcion: sol?.descripcion_problema || "" });
    }

    async function handleCrear() {
        setError("");
        if (!form.solicitud_id) { setError("Seleccione una solicitud."); return; }
        const subtotal = parseFloat(form.subtotal);
        if (isNaN(subtotal) || subtotal <= 0) { setError("Ingrese un subtotal válido."); return; }
        try {
            const res = await crearFactura({
                solicitud_id: form.solicitud_id,
                subtotal,
                descripcion: form.descripcion || undefined,
                notas: form.notas || undefined,
            });
            if (res.success) {
                setMensaje("Factura emitida exitosamente.");
                setModalCrear(false);
                cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error al crear factura."); }
        } catch { setError("Error de conexión."); }
    }

    async function handlePagar(id: number) {
        if (!confirm("¿Marcar esta factura como pagada?")) return;
        try {
            const res = await marcarFacturaPagada(id);
            if (res.success) {
                setMensaje("Factura marcada como pagada.");
                cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error."); }
        } catch { setError("Error de conexión."); }
    }

    async function handleAnular(id: number) {
        if (!confirm("¿Anular esta factura? Esta acción no se puede deshacer.")) return;
        try {
            const res = await anularFactura(id);
            if (res.success) {
                setMensaje("Factura anulada.");
                cargarDatos();
                setTimeout(() => setMensaje(""), 3000);
            } else { setError(res.message || "Error."); }
        } catch { setError("Error de conexión."); }
    }

    function exportarPDF(factura: Factura) {
        const w = window.open("", "_blank");
        if (!w) return;
        w.document.write(`<!DOCTYPE html>
<html><head><title>Factura ${factura.numero_factura}</title>
<style>
body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#333}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #FA8112;padding-bottom:20px;margin-bottom:30px}
.company h1{margin:0;color:#FA8112;font-size:22px}
.company p{margin:2px 0;font-size:12px;color:#666}
.factura-info{text-align:right}
.factura-info h2{margin:0;font-size:18px}
.factura-info p{margin:2px 0;font-size:13px}
.badge{display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:bold}
.badge-pendiente{background:#fff3cd;color:#856404}
.badge-pagada{background:#d4edda;color:#155724}
.badge-anulada{background:#f8d7da;color:#721c24}
.seccion{margin-bottom:25px}
.seccion h3{font-size:14px;color:#666;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:4px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px}
.totales{border-top:2px solid #333;margin-top:20px;padding-top:15px}
.total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:14px}
.total-row.grand{font-size:18px;font-weight:bold;color:#FA8112;border-top:1px solid #ccc;padding-top:8px;margin-top:8px}
.notas{background:#f9f9f9;padding:12px;border-radius:6px;font-size:13px;margin-top:20px}
@media print{body{padding:20px}}
</style></head><body>
<div class="header">
<div class="company">
<h1>Grúas Heredianas Gimome S.A.</h1>
<p>Cédula Jurídica: 3-101-000000</p>
<p>Heredia, Costa Rica</p>
<p>Tel: (506) 2222-0000</p>
</div>
<div class="factura-info">
<h2>${factura.numero_factura}</h2>
<p>Fecha: ${new Date(factura.fecha_emision).toLocaleDateString("es-CR")}</p>
<p><span class="badge badge-${factura.estado.toLowerCase()}">${factura.estado}</span></p>
</div>
</div>
<div class="seccion">
<h3>Datos del Cliente</h3>
<div class="grid">
<div><strong>Nombre:</strong> ${factura.cliente_nombre}</div>
<div><strong>Teléfono:</strong> ${factura.cliente_telefono || "—"}</div>
<div><strong>Email:</strong> ${factura.cliente_email || "—"}</div>
<div><strong>Solicitud:</strong> ${factura.numero_servicio || "—"}</div>
</div>
</div>
<div class="seccion">
<h3>Detalle del Servicio</h3>
<p style="font-size:14px">${factura.descripcion || "Servicio de grúa"}</p>
</div>
<div class="totales">
<div class="total-row"><span>Subtotal</span><span>&#x20a1;${factura.subtotal.toLocaleString("es-CR", { minimumFractionDigits: 2 })}</span></div>
<div class="total-row"><span>IVA (${factura.impuesto_pct}%)</span><span>&#x20a1;${factura.impuesto_monto.toLocaleString("es-CR", { minimumFractionDigits: 2 })}</span></div>
<div class="total-row grand"><span>Total</span><span>&#x20a1;${factura.total.toLocaleString("es-CR", { minimumFractionDigits: 2 })}</span></div>
</div>
${factura.fecha_pago ? `<p style="font-size:13px;color:#155724;margin-top:15px"><strong>Pagada el:</strong> ${new Date(factura.fecha_pago).toLocaleDateString("es-CR")}</p>` : ""}
${factura.notas ? `<div class="notas"><strong>Notas:</strong> ${factura.notas}</div>` : ""}
<script>window.onload=function(){window.print()}<\/script>
</body></html>`);
        w.document.close();
    }

    function formatFecha(fecha: string | null): string {
        if (!fecha) return "—";
        return new Date(fecha).toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" });
    }

    function formatMoneda(monto: number): string {
        return "₡" + monto.toLocaleString("es-CR", { minimumFractionDigits: 2 });
    }

    function getBadgeEstado(estado: string) {
        const map: Record<string, string> = {
            "Pendiente": "badge-warning", "Pagada": "badge-disponible", "Anulada": "badge-danger",
        };
        return map[estado] || "badge-info";
    }

    const subtotalNum = parseFloat(form.subtotal) || 0;
    const impuestoCalc = Math.round(subtotalNum * 0.13 * 100) / 100;
    const totalCalc = Math.round((subtotalNum + impuestoCalc) * 100) / 100;

    return (
        <div className="page-enter">
            {mensaje && <div className="alert alert-success">{mensaje}</div>}
            {error && !modalCrear && <div className="alert alert-error">{error}</div>}

            {resumen && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                    <div className="glass-panel" style={{ padding: "16px", textAlign: "center" }}>
                        <div className="text-muted" style={{ fontSize: "13px" }}>Pendiente de cobro</div>
                        <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-warning, #e6a817)" }}>{formatMoneda(resumen.total_pendiente)}</div>
                        <div className="text-muted" style={{ fontSize: "12px" }}>{resumen.cantidad_pendientes} facturas</div>
                    </div>
                    <div className="glass-panel" style={{ padding: "16px", textAlign: "center" }}>
                        <div className="text-muted" style={{ fontSize: "13px" }}>Total cobrado</div>
                        <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-success, #28a745)" }}>{formatMoneda(resumen.total_pagado)}</div>
                        <div className="text-muted" style={{ fontSize: "12px" }}>{resumen.cantidad_pagadas} facturas</div>
                    </div>
                    <div className="glass-panel" style={{ padding: "16px", textAlign: "center" }}>
                        <div className="text-muted" style={{ fontSize: "13px" }}>Anuladas</div>
                        <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-danger, #dc3545)" }}>{resumen.cantidad_anuladas}</div>
                    </div>
                </div>
            )}

            <div className="glass-panel" style={{ padding: "20px" }}>
                <div className="panel-header">
                    <h3 className="panel-title">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                            <Icon name="invoice" size={22} /> Facturación
                        </span>
                    </h3>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <select className="form-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ minWidth: "140px" }}>
                            <option value="">Todas</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Pagada">Pagada</option>
                            <option value="Anulada">Anulada</option>
                        </select>
                        <button className="btn btn-primary" onClick={abrirModalCrear}>
                            <Icon name="add" size={18} /> Nueva Factura
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">Cargando...</div>
                ) : facturas.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">No hay facturas registradas.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>N° Factura</th><th>Fecha</th><th>Cliente</th>
                                    <th>Descripción</th><th>Total</th><th>Estado</th><th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facturas.map(f => (
                                    <tr key={f.id}>
                                        <td style={{ fontWeight: 500 }}>{f.numero_factura}</td>
                                        <td className="text-muted">{formatFecha(f.fecha_emision)}</td>
                                        <td>{f.cliente_nombre}</td>
                                        <td className="text-muted" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {f.descripcion || "—"}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{formatMoneda(f.total)}</td>
                                        <td><span className={`badge ${getBadgeEstado(f.estado)}`}>{f.estado}</span></td>
                                        <td>
                                            <div style={{ display: "flex", gap: "4px" }}>
                                                {f.estado === "Pendiente" && (
                                                    <>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handlePagar(f.id)} title="Marcar pagada">
                                                            <Icon name="check" size={14} /> Pagar
                                                        </button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleAnular(f.id)} title="Anular">
                                                            <Icon name="close" size={14} /> Anular
                                                        </button>
                                                    </>
                                                )}
                                                <button className="btn btn-ghost btn-sm" onClick={() => exportarPDF(f)} title="Exportar PDF">
                                                    <Icon name="chart" size={14} /> PDF
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modalCrear && (
                <div className="modal-overlay" onClick={() => setModalCrear(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Nueva Factura</h3>
                            <button className="modal-close" onClick={() => setModalCrear(false)}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}

                        <div className="form-group">
                            <label className="form-label">Solicitud finalizada *</label>
                            <select className="form-select" value={form.solicitud_id}
                                onChange={e => seleccionarSolicitud(parseInt(e.target.value))}>
                                <option value={0}>Seleccione una solicitud...</option>
                                {solicitudesDisponibles.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.numero_servicio} — {s.cliente_nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {solicitudSeleccionada && (
                            <div className="glass-panel" style={{ padding: "12px", marginBottom: "12px", fontSize: "13px" }}>
                                <div><strong>Cliente:</strong> {solicitudSeleccionada.cliente_nombre}</div>
                                <div><strong>Teléfono:</strong> {solicitudSeleccionada.cliente_telefono || "—"}</div>
                                <div><strong>Email:</strong> {solicitudSeleccionada.cliente_email || "—"}</div>
                                <div><strong>Finalizada:</strong> {formatFecha(solicitudSeleccionada.fecha_finalizacion)}</div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Subtotal (₡) *</label>
                            <input className="form-input" type="number" min="0" step="0.01"
                                value={form.subtotal} placeholder="Monto del servicio"
                                onChange={e => setForm({ ...form, subtotal: e.target.value })} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Descripción</label>
                            <textarea className="form-input" rows={2} value={form.descripcion}
                                placeholder="Descripción del servicio facturado"
                                onChange={e => setForm({ ...form, descripcion: e.target.value })} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notas</label>
                            <textarea className="form-input" rows={2} value={form.notas}
                                placeholder="Notas adicionales (opcional)"
                                onChange={e => setForm({ ...form, notas: e.target.value })} />
                        </div>

                        {subtotalNum > 0 && (
                            <div className="glass-panel" style={{ padding: "12px", marginBottom: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                                    <span>Subtotal</span><span>{formatMoneda(subtotalNum)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                                    <span>IVA (13%)</span><span>{formatMoneda(impuestoCalc)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 700, borderTop: "1px solid var(--border-color)", paddingTop: "8px", marginTop: "8px", color: "var(--color-primary)" }}>
                                    <span>Total</span><span>{formatMoneda(totalCalc)}</span>
                                </div>
                            </div>
                        )}

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalCrear(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleCrear}>Emitir Factura</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
