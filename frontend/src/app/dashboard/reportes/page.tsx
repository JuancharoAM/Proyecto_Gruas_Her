"use client";

/**
 * ============================================================================
 * Página de Reportes
 * ============================================================================
 * Visualización de reportes operativos con gráficos CSS y tablas.
 * Tres reportes: Solicitudes, Flota, Operativo.
 * Incluye exportación a CSV y PDF para descarga.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import {
    reporteSolicitudes, reporteFlota, reporteOperativo,
} from "@/lib/api";
import { ReporteSolicitudes, ReporteFlota, ReporteOperativo } from "@/types";
import Icon from "@/components/Icon";

type TabReporte = "solicitudes" | "flota" | "operativo";

export default function ReportesPage() {
    const [tab, setTab] = useState<TabReporte>("solicitudes");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Datos
    const [dataSol, setDataSol] = useState<ReporteSolicitudes | null>(null);
    const [dataFlota, setDataFlota] = useState<ReporteFlota | null>(null);
    const [dataOp, setDataOp] = useState<ReporteOperativo | null>(null);

    // Filtros de fecha (solo solicitudes)
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");

    async function cargarReporte(tipo: TabReporte) {
        setLoading(true);
        setError("");
        try {
            if (tipo === "solicitudes") {
                const res = await reporteSolicitudes(fechaDesde || undefined, fechaHasta || undefined);
                if (res.success && res.data) setDataSol(res.data);
                else setError(res.message || "Error al cargar reporte.");
            } else if (tipo === "flota") {
                const res = await reporteFlota();
                if (res.success && res.data) setDataFlota(res.data);
                else setError(res.message || "Error al cargar reporte.");
            } else {
                const res = await reporteOperativo();
                if (res.success && res.data) setDataOp(res.data);
                else setError(res.message || "Error al cargar reporte.");
            }
        } catch { setError("Error de conexión al cargar reporte."); }
        setLoading(false);
    }

    useEffect(() => { cargarReporte(tab); }, [tab]);

    // ======================== Exportar CSV ========================

    function descargarCSV(nombre: string, cabeceras: string[], filas: string[][]) {
        const bom = "\uFEFF";
        const csv = bom + [cabeceras.join(","), ...filas.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${nombre}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportarSolicitudes() {
        if (!dataSol) return;
        const cab = ["# Servicio", "Cliente", "Estado", "Prioridad", "Fecha", "Grúa", "Chofer"];
        const filas = dataSol.recientes.map(s => [
            s.numero_servicio, s.cliente_nombre, s.estado, s.prioridad,
            formatFecha(s.fecha_solicitud), s.camion_placa || "", s.chofer_nombre || "",
        ]);
        descargarCSV("reporte_solicitudes", cab, filas);
    }

    function exportarFlota() {
        if (!dataFlota) return;
        const cab = ["Placa", "Marca", "Modelo", "Total Litros", "Total Costo", "Cargas"];
        const filas = dataFlota.combustible_por_camion.map(c => [
            c.camion_placa, c.marca, c.modelo, String(c.total_litros), String(c.total_costo), String(c.cargas),
        ]);
        descargarCSV("reporte_flota", cab, filas);
    }

    function exportarOperativo() {
        if (!dataOp) return;
        const cab = ["Chofer", "Total Servicios", "Finalizados", "Cancelados", "Activos"];
        const filas = dataOp.servicios_por_chofer.map(c => [
            c.chofer_nombre, String(c.total), String(c.finalizados), String(c.cancelados), String(c.activos),
        ]);
        descargarCSV("reporte_operativo", cab, filas);
    }

    // ======================== Exportar PDF (ventana de impresión) ========================

    function abrirPDF(titulo: string, contenidoHTML: string) {
        const win = window.open("", "_blank", "width=900,height=700");
        if (!win) { alert("Permitir ventanas emergentes para exportar PDF."); return; }
        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titulo} — Grúas Heredianas</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; padding: 32px; font-size: 13px; }
  .pdf-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #FA8112; padding-bottom: 12px; margin-bottom: 24px; }
  .pdf-header h1 { font-size: 22px; color: #FA8112; }
  .pdf-header .fecha { font-size: 12px; color: #666; }
  .pdf-empresa { font-size: 11px; color: #999; }
  h2 { font-size: 16px; color: #333; margin: 24px 0 12px; border-left: 4px solid #FA8112; padding-left: 10px; }
  h3 { font-size: 14px; color: #555; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f8f4ef; color: #333; font-weight: 600; padding: 8px 10px; text-align: left; border-bottom: 2px solid #ddd; font-size: 12px; }
  td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
  tr:nth-child(even) { background: #fafafa; }
  .stat-row { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .stat-box { flex: 1; min-width: 110px; text-align: center; padding: 14px 8px; border-radius: 8px; border: 1px solid #eee; background: #fefefe; }
  .stat-box .valor { font-size: 24px; font-weight: 700; }
  .stat-box .label { font-size: 11px; color: #888; margin-top: 4px; }
  .bar-container { margin-bottom: 16px; }
  .bar-row { display: flex; align-items: center; margin-bottom: 6px; }
  .bar-label { width: 120px; text-align: right; padding-right: 10px; font-size: 12px; color: #666; }
  .bar-track { flex: 1; height: 22px; background: #f0f0f0; border-radius: 4px; overflow: hidden; position: relative; }
  .bar-fill { height: 100%; border-radius: 4px; display: flex; align-items: center; justify-content: flex-end; padding-right: 6px; }
  .bar-fill span { font-size: 10px; font-weight: 600; color: white; }
  .badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 10px; color: #999; }
  @media print {
    body { padding: 16px; }
    .no-print { display: none !important; }
    @page { margin: 15mm; size: A4; }
  }
</style></head><body>
<div class="pdf-header">
  <div><h1>${titulo}</h1><div class="pdf-empresa">Grúas Heredianas Gimome S.A.</div></div>
  <div class="fecha">Generado: ${new Date().toLocaleDateString("es-CR", { day: "2-digit", month: "long", year: "numeric" })} — ${new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}</div>
</div>
${contenidoHTML}
<div class="footer">
  <span>Grúas Heredianas Gimome S.A. — Reporte generado automáticamente</span>
  <span>${new Date().getFullYear()}</span>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
        win.document.close();
    }

    function generarBarrasHTML(items: { label: string; valor: number }[], colorMap: Record<string, string>) {
        const max = Math.max(...items.map(i => i.valor), 1);
        return `<div class="bar-container">${items.map(item => {
            const pct = Math.max((item.valor / max) * 100, 3);
            const color = colorMap[item.label] || "#FA8112";
            return `<div class="bar-row"><div class="bar-label">${item.label}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"><span>${item.valor}</span></div></div></div>`;
        }).join("")}</div>`;
    }

    function exportarSolicitudesPDF() {
        if (!dataSol) return;
        const { resumen } = dataSol;
        const coloresEstado: Record<string, string> = {
            "Pendiente": "#f59e0b", "Asignada": "#3b82f6", "En camino": "#8b5cf6",
            "Atendiendo": "#f97316", "Finalizada": "#10b981", "Cancelada": "#ef4444",
        };
        let html = `
<div class="stat-row">
  <div class="stat-box"><div class="valor" style="color:#FA8112">${resumen.total}</div><div class="label">Total</div></div>
  <div class="stat-box"><div class="valor" style="color:#10b981">${resumen.finalizadas}</div><div class="label">Finalizadas</div></div>
  <div class="stat-box"><div class="valor" style="color:#3b82f6">${resumen.asignadas + resumen.en_camino + resumen.atendiendo}</div><div class="label">Activas</div></div>
  <div class="stat-box"><div class="valor" style="color:#f59e0b">${resumen.pendientes}</div><div class="label">Pendientes</div></div>
  <div class="stat-box"><div class="valor" style="color:#ef4444">${resumen.canceladas}</div><div class="label">Canceladas</div></div>
  <div class="stat-box"><div class="valor" style="color:#10b981">${resumen.tasa_finalizacion}%</div><div class="label">Tasa Éxito</div></div>
</div>`;
        html += `<h2>Distribución por Estado</h2>`;
        html += generarBarrasHTML([
            { label: "Pendiente", valor: resumen.pendientes }, { label: "Asignada", valor: resumen.asignadas },
            { label: "En camino", valor: resumen.en_camino }, { label: "Atendiendo", valor: resumen.atendiendo },
            { label: "Finalizada", valor: resumen.finalizadas }, { label: "Cancelada", valor: resumen.canceladas },
        ], coloresEstado);

        if (dataSol.por_tipo_servicio.length > 0) {
            html += `<h2>Por Tipo de Servicio</h2>`;
            html += generarBarrasHTML(dataSol.por_tipo_servicio.map(t => ({ label: t.tipo, valor: t.cantidad })), { "Estándar": "#3b82f6", "Pesado": "#f97316", "Especial": "#8b5cf6" });
        }
        if (dataSol.por_prioridad.length > 0) {
            html += `<h2>Por Prioridad</h2>`;
            html += generarBarrasHTML(dataSol.por_prioridad.map(p => ({ label: p.prioridad, valor: p.cantidad })), { "Baja": "#6b7280", "Normal": "#3b82f6", "Alta": "#f59e0b", "Urgente": "#ef4444" });
        }
        if (dataSol.por_mes.length > 0) {
            html += `<h2>Tendencia Mensual</h2><table><thead><tr><th>Mes</th><th>Finalizadas</th><th>Canceladas</th></tr></thead><tbody>`;
            dataSol.por_mes.forEach(m => { html += `<tr><td>${formatMes(m.mes)}</td><td style="color:#10b981;font-weight:600">${m.finalizadas}</td><td style="color:#ef4444">${m.canceladas}</td></tr>`; });
            html += `</tbody></table>`;
        }
        html += `<h2>Solicitudes Recientes</h2><table><thead><tr><th># Servicio</th><th>Cliente</th><th>Estado</th><th>Prioridad</th><th>Grúa</th><th>Chofer</th><th>Fecha</th></tr></thead><tbody>`;
        dataSol.recientes.forEach(s => {
            html += `<tr><td style="font-weight:600">${s.numero_servicio}</td><td>${s.cliente_nombre}</td><td>${s.estado}</td><td>${s.prioridad}</td><td>${s.camion_placa || "—"}</td><td>${s.chofer_nombre || "—"}</td><td>${formatFecha(s.fecha_solicitud)}</td></tr>`;
        });
        html += `</tbody></table>`;
        const rango = fechaDesde || fechaHasta ? ` (${fechaDesde || "inicio"} — ${fechaHasta || "hoy"})` : "";
        abrirPDF(`Reporte de Solicitudes${rango}`, html);
    }

    function exportarFlotaPDF() {
        if (!dataFlota) return;
        const { resumen } = dataFlota;
        let html = `
<div class="stat-row">
  <div class="stat-box"><div class="valor" style="color:#FA8112">${resumen.total}</div><div class="label">Total Flota</div></div>
  <div class="stat-box"><div class="valor" style="color:#10b981">${resumen.disponibles}</div><div class="label">Disponibles</div></div>
  <div class="stat-box"><div class="valor" style="color:#3b82f6">${resumen.en_servicio}</div><div class="label">En Servicio</div></div>
  <div class="stat-box"><div class="valor" style="color:#f59e0b">${resumen.en_mantenimiento}</div><div class="label">Mantenimiento</div></div>
  <div class="stat-box"><div class="valor" style="color:#ef4444">${resumen.fuera_servicio}</div><div class="label">Fuera de Servicio</div></div>
</div>`;
        html += `<h2>Estado de la Flota</h2>`;
        html += generarBarrasHTML(dataFlota.por_estado.map(e => ({ label: e.estado, valor: e.cantidad })), { "Disponible": "#10b981", "En servicio": "#3b82f6", "Mantenimiento": "#f59e0b", "Fuera de servicio": "#ef4444" });

        if (dataFlota.por_tipo.length > 0) {
            html += `<h2>Por Tipo de Grúa</h2><table><thead><tr><th>Tipo</th><th>Cantidad</th><th>Disponibles</th></tr></thead><tbody>`;
            dataFlota.por_tipo.forEach(t => { html += `<tr><td>${t.tipo}</td><td>${t.cantidad}</td><td style="color:#10b981;font-weight:600">${t.disponibles}</td></tr>`; });
            html += `</tbody></table>`;
        }
        if (dataFlota.combustible_por_camion.length > 0) {
            html += `<h2>Consumo de Combustible por Camión</h2><table><thead><tr><th>Placa</th><th>Marca</th><th>Modelo</th><th>Litros</th><th>Costo Total</th><th>Cargas</th></tr></thead><tbody>`;
            dataFlota.combustible_por_camion.forEach(c => { html += `<tr><td style="font-weight:600">${c.camion_placa}</td><td>${c.marca}</td><td>${c.modelo}</td><td>${Number(c.total_litros).toFixed(1)} L</td><td style="font-weight:600;color:#FA8112">${formatMoneda(Number(c.total_costo))}</td><td>${c.cargas}</td></tr>`; });
            html += `</tbody></table>`;
        }
        if (dataFlota.mantenimientos_recientes.length > 0) {
            html += `<h2>Mantenimientos Recientes</h2><table><thead><tr><th>Placa</th><th>Tipo</th><th>Estado</th><th>Descripción</th><th>Costo</th><th>Fecha</th></tr></thead><tbody>`;
            dataFlota.mantenimientos_recientes.forEach(m => { html += `<tr><td style="font-weight:600">${m.camion_placa}</td><td>${m.tipo}</td><td>${m.estado}</td><td>${m.descripcion}</td><td style="font-weight:600">${formatMoneda(Number(m.costo))}</td><td>${formatFecha(m.fecha)}</td></tr>`; });
            html += `</tbody></table>`;
        }
        abrirPDF("Reporte de Flota", html);
    }

    function exportarOperativoPDF() {
        if (!dataOp) return;
        let html = "";
        if (dataOp.servicios_por_chofer.length > 0) {
            html += `<h2>Rendimiento por Chofer</h2><table><thead><tr><th>Chofer</th><th>Total</th><th>Finalizados</th><th>Cancelados</th><th>Activos</th></tr></thead><tbody>`;
            dataOp.servicios_por_chofer.forEach(c => { html += `<tr><td style="font-weight:600">${c.chofer_nombre}</td><td>${c.total}</td><td style="color:#10b981;font-weight:600">${c.finalizados}</td><td style="color:#ef4444">${c.cancelados}</td><td>${c.activos}</td></tr>`; });
            html += `</tbody></table>`;
        }
        if (dataOp.solicitudes_por_dia_semana.length > 0) {
            html += `<h2>Solicitudes por Día de la Semana</h2>`;
            html += generarBarrasHTML(dataOp.solicitudes_por_dia_semana.map(d => ({ label: d.dia, valor: d.cantidad })), { "Lunes": "#3b82f6", "Martes": "#6366f1", "Miércoles": "#8b5cf6", "Jueves": "#a855f7", "Viernes": "#f59e0b", "Sábado": "#f97316", "Domingo": "#ef4444" });
        }
        if (dataOp.tiempo_promedio_resolucion.length > 0) {
            html += `<h2>Tiempo Promedio de Resolución</h2><table><thead><tr><th>Mes</th><th>Promedio (horas)</th><th>Servicios</th></tr></thead><tbody>`;
            dataOp.tiempo_promedio_resolucion.forEach(t => { html += `<tr><td>${formatMes(t.mes)}</td><td style="font-weight:600;color:#FA8112">${t.promedio_horas}h</td><td>${t.total_servicios}</td></tr>`; });
            html += `</tbody></table>`;
        }
        if (dataOp.costos_mantenimiento_mensual.length > 0 || dataOp.costos_combustible_mensual.length > 0) {
            html += `<h2>Costos Mensuales</h2><table><thead><tr><th>Mes</th><th>Mantenimiento</th><th>Combustible</th></tr></thead><tbody>`;
            const meses = new Set([...dataOp.costos_mantenimiento_mensual.map(m => m.mes), ...dataOp.costos_combustible_mensual.map(m => m.mes)]);
            Array.from(meses).sort().forEach(mes => {
                const mant = dataOp!.costos_mantenimiento_mensual.find(m => m.mes === mes);
                const comb = dataOp!.costos_combustible_mensual.find(m => m.mes === mes);
                html += `<tr><td>${formatMes(mes)}</td><td style="font-weight:600">${mant ? formatMoneda(Number(mant.total_costo)) : "—"}</td><td style="font-weight:600">${comb ? formatMoneda(Number(comb.total_costo)) : "—"}</td></tr>`;
            });
            html += `</tbody></table>`;
        }
        abrirPDF("Reporte Operativo", html);
    }

    // ======================== Utilidades ========================

    function formatFecha(fecha: string): string {
        return new Date(fecha).toLocaleDateString("es-CR", {
            day: "2-digit", month: "short", year: "numeric",
        });
    }

    function formatMes(mes: string): string {
        const [y, m] = mes.split("-");
        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        return `${meses[parseInt(m) - 1]} ${y}`;
    }

    function formatMoneda(valor: number): string {
        return "₡" + valor.toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function getBadgeClass(estado: string): string {
        const map: Record<string, string> = {
            "Pendiente": "badge-pendiente", "Asignada": "badge-asignada",
            "En camino": "badge-info", "Atendiendo": "badge-warning",
            "Finalizada": "badge-finalizada", "Cancelada": "badge-cancelada",
            "Disponible": "badge-disponible", "En servicio": "badge-en-servicio",
            "Mantenimiento": "badge-mantenimiento", "Fuera de servicio": "badge-cancelada",
            "En proceso": "badge-warning", "Completado": "badge-finalizada",
        };
        return map[estado] || "badge-info";
    }

    // ======================== Componente: Barra CSS ========================

    function BarraHorizontal({ items, colorMap }: { items: { label: string; valor: number }[]; colorMap: Record<string, string> }) {
        const max = Math.max(...items.map(i => i.valor), 1);
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {items.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ width: "110px", fontSize: "13px", textAlign: "right", flexShrink: 0, color: "var(--text-secondary)" }}>
                            {item.label}
                        </span>
                        <div style={{ flex: 1, height: "28px", background: "var(--bg-subtle)", borderRadius: "6px", overflow: "hidden", position: "relative" }}>
                            <div style={{
                                width: `${Math.max((item.valor / max) * 100, 2)}%`,
                                height: "100%",
                                background: colorMap[item.label] || "var(--color-primary)",
                                borderRadius: "6px",
                                transition: "width 0.6s ease",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                paddingRight: "8px",
                            }}>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: "white", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                                    {item.valor}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    function BarraDoble({ items }: { items: { label: string; val1: number; val2: number; label1: string; label2: string; color1: string; color2: string }[] }) {
        const max = Math.max(...items.flatMap(i => [i.val1, i.val2]), 1);
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {items.map((item, i) => (
                    <div key={i}>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>{item.label}</div>
                        <div style={{ display: "flex", gap: "4px" }}>
                            <div style={{ flex: 1, height: "20px", background: "var(--bg-subtle)", borderRadius: "4px", overflow: "hidden" }}>
                                <div style={{ width: `${Math.max((item.val1 / max) * 100, 2)}%`, height: "100%", background: item.color1, borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontSize: "10px", fontWeight: 600, color: "white" }}>{item.val1}</span>
                                </div>
                            </div>
                            <div style={{ flex: 1, height: "20px", background: "var(--bg-subtle)", borderRadius: "4px", overflow: "hidden" }}>
                                <div style={{ width: `${Math.max((item.val2 / max) * 100, 2)}%`, height: "100%", background: item.color2, borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontSize: "10px", fontWeight: 600, color: "white" }}>{item.val2}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                            <span style={{ flex: 1, fontSize: "10px", color: item.color1 }}>{item.label1}</span>
                            <span style={{ flex: 1, fontSize: "10px", color: item.color2 }}>{item.label2}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // ======================== Stat Card ========================

    function StatCard({ label, valor, color, icono }: { label: string; valor: string | number; color: string; icono?: string }) {
        return (
            <div style={{
                background: "var(--bg-surface, #fff)", borderRadius: "var(--radius-lg, 12px)",
                padding: "20px", border: "1px solid var(--border-color)", textAlign: "center",
            }}>
                {icono && <div style={{ color, marginBottom: "8px" }}><Icon name={icono} size={24} /></div>}
                <div style={{ fontSize: "28px", fontWeight: 700, color, lineHeight: 1.1 }}>{valor}</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>{label}</div>
            </div>
        );
    }

    // ======================== Render Solicitudes ========================

    function renderSolicitudes() {
        if (!dataSol) return null;
        const { resumen } = dataSol;
        const coloresEstado: Record<string, string> = {
            "Pendiente": "#f59e0b", "Asignada": "#3b82f6", "En camino": "#8b5cf6",
            "Atendiendo": "#f97316", "Finalizada": "#10b981", "Cancelada": "#ef4444",
        };

        return (
            <>
                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", marginBottom: "24px" }}>
                    <StatCard label="Total" valor={resumen.total} color="var(--color-primary)" icono="solicitudes" />
                    <StatCard label="Finalizadas" valor={resumen.finalizadas} color="#10b981" icono="check-circle" />
                    <StatCard label="Activas" valor={resumen.asignadas + resumen.en_camino + resumen.atendiendo} color="#3b82f6" icono="route" />
                    <StatCard label="Pendientes" valor={resumen.pendientes} color="#f59e0b" icono="clock" />
                    <StatCard label="Canceladas" valor={resumen.canceladas} color="#ef4444" icono="close" />
                    <StatCard label="Tasa éxito" valor={`${resumen.tasa_finalizacion}%`} color="#10b981" icono="chart" />
                </div>

                {/* Gráficos en grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                    {/* Distribución por estado */}
                    <div className="glass-panel" style={{ padding: "20px" }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Distribución por Estado</h4>
                        <BarraHorizontal
                            items={[
                                { label: "Pendiente", valor: resumen.pendientes },
                                { label: "Asignada", valor: resumen.asignadas },
                                { label: "En camino", valor: resumen.en_camino },
                                { label: "Atendiendo", valor: resumen.atendiendo },
                                { label: "Finalizada", valor: resumen.finalizadas },
                                { label: "Cancelada", valor: resumen.canceladas },
                            ]}
                            colorMap={coloresEstado}
                        />
                    </div>

                    {/* Por tipo de servicio */}
                    <div className="glass-panel" style={{ padding: "20px" }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Por Tipo de Servicio</h4>
                        <BarraHorizontal
                            items={dataSol.por_tipo_servicio.map(t => ({ label: t.tipo, valor: t.cantidad }))}
                            colorMap={{ "Estándar": "#3b82f6", "Pesado": "#f97316", "Especial": "#8b5cf6" }}
                        />
                        {dataSol.por_tipo_servicio.length === 0 && <p className="text-muted" style={{ fontSize: "13px" }}>Sin datos</p>}
                    </div>

                    {/* Tendencia mensual */}
                    <div className="glass-panel" style={{ padding: "20px" }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Tendencia Mensual (6 meses)</h4>
                        {dataSol.por_mes.length > 0 ? (
                            <BarraDoble items={dataSol.por_mes.map(m => ({
                                label: formatMes(m.mes), val1: m.finalizadas, val2: m.canceladas,
                                label1: "Finalizadas", label2: "Canceladas",
                                color1: "#10b981", color2: "#ef4444",
                            }))} />
                        ) : <p className="text-muted" style={{ fontSize: "13px" }}>Sin datos históricos</p>}
                    </div>

                    {/* Por prioridad */}
                    <div className="glass-panel" style={{ padding: "20px" }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Por Prioridad</h4>
                        <BarraHorizontal
                            items={dataSol.por_prioridad.map(p => ({ label: p.prioridad, valor: p.cantidad }))}
                            colorMap={{ "Baja": "#6b7280", "Normal": "#3b82f6", "Alta": "#f59e0b", "Urgente": "#ef4444" }}
                        />
                        {dataSol.por_prioridad.length === 0 && <p className="text-muted" style={{ fontSize: "13px" }}>Sin datos</p>}
                    </div>
                </div>

                {/* Tabla de recientes */}
                <div className="glass-panel" style={{ padding: "20px" }}>
                    <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Solicitudes Recientes</h4>
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th># Servicio</th><th>Cliente</th><th>Estado</th>
                                    <th>Prioridad</th><th>Grúa</th><th>Chofer</th><th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataSol.recientes.map((s, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600 }}>{s.numero_servicio}</td>
                                        <td>{s.cliente_nombre}</td>
                                        <td><span className={`badge ${getBadgeClass(s.estado)}`}>{s.estado}</span></td>
                                        <td>{s.prioridad}</td>
                                        <td>{s.camion_placa || "—"}</td>
                                        <td>{s.chofer_nombre || "—"}</td>
                                        <td className="text-muted">{formatFecha(s.fecha_solicitud)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        );
    }

    // ======================== Render Flota ========================

    function renderFlota() {
        if (!dataFlota) return null;
        const { resumen } = dataFlota;
        const coloresFlota: Record<string, string> = {
            "Disponible": "#10b981", "En servicio": "#3b82f6",
            "Mantenimiento": "#f59e0b", "Fuera de servicio": "#ef4444",
        };

        return (
            <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "24px" }}>
                    <StatCard label="Total Flota" valor={resumen.total} color="var(--color-primary)" icono="truck" />
                    <StatCard label="Disponibles" valor={resumen.disponibles} color="#10b981" icono="check-circle" />
                    <StatCard label="En Servicio" valor={resumen.en_servicio} color="#3b82f6" icono="route" />
                    <StatCard label="Mantenimiento" valor={resumen.en_mantenimiento} color="#f59e0b" icono="wrench" />
                    <StatCard label="Fuera de Servicio" valor={resumen.fuera_servicio} color="#ef4444" icono="close" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                    {/* Por estado */}
                    <div className="glass-panel" style={{ padding: "20px" }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Estado de la Flota</h4>
                        <BarraHorizontal
                            items={dataFlota.por_estado.map(e => ({ label: e.estado, valor: e.cantidad }))}
                            colorMap={coloresFlota}
                        />
                    </div>

                    {/* Por tipo */}
                    <div className="glass-panel" style={{ padding: "20px" }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Por Tipo de Grúa</h4>
                        {dataFlota.por_tipo.map((t, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
                                <span style={{ fontWeight: 500 }}>{t.tipo}</span>
                                <div style={{ display: "flex", gap: "12px", fontSize: "13px" }}>
                                    <span style={{ color: "var(--text-secondary)" }}>{t.cantidad} total</span>
                                    <span style={{ color: "#10b981", fontWeight: 600 }}>{t.disponibles} disp.</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Combustible por camión */}
                {dataFlota.combustible_por_camion.length > 0 && (
                    <div className="glass-panel" style={{ padding: "20px", marginBottom: "16px" }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Consumo de Combustible por Camión</h4>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Placa</th><th>Marca</th><th>Modelo</th><th>Litros</th><th>Costo Total</th><th>Cargas</th></tr>
                                </thead>
                                <tbody>
                                    {dataFlota.combustible_por_camion.map((c, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{c.camion_placa}</td>
                                            <td>{c.marca}</td>
                                            <td>{c.modelo}</td>
                                            <td>{Number(c.total_litros).toFixed(1)} L</td>
                                            <td style={{ fontWeight: 600, color: "var(--color-primary)" }}>{formatMoneda(Number(c.total_costo))}</td>
                                            <td>{c.cargas}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Mantenimientos recientes */}
                {dataFlota.mantenimientos_recientes.length > 0 && (
                    <div className="glass-panel" style={{ padding: "20px" }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Mantenimientos Recientes</h4>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Placa</th><th>Tipo</th><th>Estado</th><th>Descripción</th><th>Costo</th><th>Fecha</th></tr>
                                </thead>
                                <tbody>
                                    {dataFlota.mantenimientos_recientes.map((m, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{m.camion_placa}</td>
                                            <td>{m.tipo}</td>
                                            <td><span className={`badge ${getBadgeClass(m.estado)}`}>{m.estado}</span></td>
                                            <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.descripcion}</td>
                                            <td style={{ fontWeight: 600 }}>{formatMoneda(Number(m.costo))}</td>
                                            <td className="text-muted">{formatFecha(m.fecha)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // ======================== Render Operativo ========================

    function renderOperativo() {
        if (!dataOp) return null;

        return (
            <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                    {/* Rendimiento por chofer */}
                    <div className="glass-panel" style={{ padding: "20px" }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Rendimiento por Chofer</h4>
                        {dataOp.servicios_por_chofer.length > 0 ? (
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Chofer</th><th>Total</th><th>Finalizados</th><th>Cancelados</th><th>Activos</th></tr>
                                    </thead>
                                    <tbody>
                                        {dataOp.servicios_por_chofer.map((c, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{c.chofer_nombre}</td>
                                                <td>{c.total}</td>
                                                <td style={{ color: "#10b981", fontWeight: 600 }}>{c.finalizados}</td>
                                                <td style={{ color: "#ef4444" }}>{c.cancelados}</td>
                                                <td><span className="badge badge-info">{c.activos}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="text-muted" style={{ fontSize: "13px" }}>Sin datos de choferes</p>}
                    </div>

                    {/* Solicitudes por día de la semana */}
                    <div className="glass-panel" style={{ padding: "20px" }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Solicitudes por Día de la Semana</h4>
                        {dataOp.solicitudes_por_dia_semana.length > 0 ? (
                            <BarraHorizontal
                                items={dataOp.solicitudes_por_dia_semana.map(d => ({ label: d.dia, valor: d.cantidad }))}
                                colorMap={{
                                    "Lunes": "#3b82f6", "Martes": "#6366f1", "Miércoles": "#8b5cf6",
                                    "Jueves": "#a855f7", "Viernes": "#f59e0b", "Sábado": "#f97316", "Domingo": "#ef4444",
                                }}
                            />
                        ) : <p className="text-muted" style={{ fontSize: "13px" }}>Sin datos</p>}
                    </div>

                    {/* Tiempo promedio de resolución */}
                    <div className="glass-panel" style={{ padding: "20px" }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Tiempo Promedio de Resolución</h4>
                        {dataOp.tiempo_promedio_resolucion.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {dataOp.tiempo_promedio_resolucion.map((t, i) => (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--bg-subtle)", borderRadius: "8px" }}>
                                        <span style={{ fontSize: "13px", fontWeight: 500 }}>{formatMes(t.mes)}</span>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-primary)" }}>{t.promedio_horas}h</span>
                                            <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginLeft: "8px" }}>{t.total_servicios} servicios</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-muted" style={{ fontSize: "13px" }}>Sin datos de servicios finalizados</p>}
                    </div>

                    {/* Costos mensuales */}
                    <div className="glass-panel" style={{ padding: "20px" }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>Costos Mensuales</h4>
                        {(dataOp.costos_mantenimiento_mensual.length > 0 || dataOp.costos_combustible_mensual.length > 0) ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {/* Leyenda */}
                                <div style={{ display: "flex", gap: "16px", marginBottom: "8px", fontSize: "12px" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#f59e0b", display: "inline-block" }} /> Mantenimiento
                                    </span>
                                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#3b82f6", display: "inline-block" }} /> Combustible
                                    </span>
                                </div>
                                {/* Unir datos por mes */}
                                {(() => {
                                    const meses = new Set([
                                        ...dataOp.costos_mantenimiento_mensual.map(m => m.mes),
                                        ...dataOp.costos_combustible_mensual.map(m => m.mes),
                                    ]);
                                    return Array.from(meses).sort().map((mes, i) => {
                                        const mant = dataOp!.costos_mantenimiento_mensual.find(m => m.mes === mes);
                                        const comb = dataOp!.costos_combustible_mensual.find(m => m.mes === mes);
                                        return (
                                            <div key={i} style={{ padding: "10px 12px", background: "var(--bg-subtle)", borderRadius: "8px" }}>
                                                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>{formatMes(mes)}</div>
                                                <div style={{ display: "flex", gap: "16px" }}>
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontSize: "11px", color: "#f59e0b" }}>Mant.</span>
                                                        <div style={{ fontSize: "15px", fontWeight: 600 }}>{mant ? formatMoneda(Number(mant.total_costo)) : "—"}</div>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontSize: "11px", color: "#3b82f6" }}>Comb.</span>
                                                        <div style={{ fontSize: "15px", fontWeight: 600 }}>{comb ? formatMoneda(Number(comb.total_costo)) : "—"}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        ) : <p className="text-muted" style={{ fontSize: "13px" }}>Sin datos de costos</p>}
                    </div>
                </div>
            </>
        );
    }

    // ======================== Render Principal ========================

    const tabLabels: Record<TabReporte, string> = { solicitudes: "Solicitudes", flota: "Flota", operativo: "Operativo" };
    const exportFns: Record<TabReporte, (() => void) | null> = { solicitudes: exportarSolicitudes, flota: exportarFlota, operativo: exportarOperativo };
    const exportPDFFns: Record<TabReporte, (() => void) | null> = { solicitudes: exportarSolicitudesPDF, flota: exportarFlotaPDF, operativo: exportarOperativoPDF };

    return (
        <div className="page-enter">
            {error && <div className="alert alert-error">{error}</div>}

            {/* Header con tabs y acciones */}
            <div className="glass-panel" style={{ padding: "16px 20px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <div className="tabs">
                        {(["solicitudes", "flota", "operativo"] as TabReporte[]).map(t => (
                            <button key={t} className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => setTab(t)}>
                                {tabLabels[t]}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        {/* Filtros de fecha solo para solicitudes */}
                        {tab === "solicitudes" && (
                            <>
                                <input type="date" className="form-input" style={{ width: "150px", padding: "6px 10px", fontSize: "13px" }}
                                    value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} title="Desde" />
                                <input type="date" className="form-input" style={{ width: "150px", padding: "6px 10px", fontSize: "13px" }}
                                    value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} title="Hasta" />
                                <button className="btn btn-ghost btn-sm" onClick={() => cargarReporte("solicitudes")}>
                                    <Icon name="chart" size={14} /> Filtrar
                                </button>
                            </>
                        )}

                        <button className="btn btn-primary btn-sm" onClick={() => { const fn = exportPDFFns[tab]; if (fn) fn(); }}
                            style={{ background: "#ef4444", borderColor: "#ef4444" }}>
                            <Icon name="arrowRight" size={14} /> PDF
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => { const fn = exportFns[tab]; if (fn) fn(); }}>
                            <Icon name="arrowRight" size={14} /> CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            {loading ? (
                <div style={{ padding: "60px", textAlign: "center" }} className="text-muted">
                    <div className="skeleton" style={{ width: "200px", height: "24px", margin: "0 auto 16px", borderRadius: "8px" }} />
                    <p>Generando reporte...</p>
                </div>
            ) : (
                <>
                    {tab === "solicitudes" && renderSolicitudes()}
                    {tab === "flota" && renderFlota()}
                    {tab === "operativo" && renderOperativo()}
                </>
            )}
        </div>
    );
}
