"use client";

/**
 * ============================================================================
 * Página del Dashboard Principal
 * ============================================================================
 * Resumen operativo con métricas, mapa GPS, panel lateral y tabla de solicitudes.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { obtenerEstadisticas, listarUbicacionesActivas } from "@/lib/api";
import { DashboardStats, UbicacionActiva } from "@/types";
import Icon from "@/components/Icon";

const MapaGPS = dynamic(() => import("@/components/MapaGPS"), { ssr: false });

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [ubicaciones, setUbicaciones] = useState<UbicacionActiva[]>([]);

    async function cargarDatos(silencioso = false) {
        try {
            const response = await obtenerEstadisticas();
            if (response.success && response.data) setStats(response.data);
        } catch (error) {
            if (!silencioso) console.error("Error al cargar estadísticas:", error);
        } finally {
            if (!silencioso) setLoading(false);
        }
    }

    async function cargarUbicaciones() {
        try {
            const data = await listarUbicacionesActivas();
            setUbicaciones(data);
        } catch {
            // silencioso — el mapa simplemente no se actualiza
        }
    }

    useEffect(() => {
        const userData = localStorage.getItem("usuario");
        if (userData) {
            const usuario = JSON.parse(userData);
            if (usuario.rol === "Chofer") {
                window.location.href = "/dashboard/mis-servicios";
                return;
            }
        }
        cargarDatos();
        cargarUbicaciones();
        const intervaloStats = setInterval(() => cargarDatos(true), 15000);
        const intervaloMapa = setInterval(cargarUbicaciones, 30000);
        return () => {
            clearInterval(intervaloStats);
            clearInterval(intervaloMapa);
        };
    }, []);

    function getBadgeClass(estado: string): string {
        const clases: Record<string, string> = {
            "Pendiente": "badge-pendiente", "Asignada": "badge-asignada",
            "En camino": "badge-info", "Atendiendo": "badge-warning",
            "Finalizada": "badge-finalizada", "Cancelada": "badge-cancelada",
        };
        return clases[estado] || "badge-info";
    }

    function formatFecha(fecha: string): string {
        return new Date(fecha).toLocaleDateString("es-CR", {
            day: "2-digit", month: "short", year: "numeric",
        });
    }

    if (loading) {
        return (
            <div className="page-enter">
                <div className="stats-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="stat-card glass-panel">
                            <div className="skeleton" style={{ width: "40px", height: "40px" }} />
                            <div className="skeleton" style={{ width: "60px", height: "28px" }} />
                            <div className="skeleton" style={{ width: "120px", height: "14px" }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const sol = stats?.solicitudes || { total: 0, pendientes: 0, asignadas: 0, finalizadas: 0, solicitudes_hoy: 0, recientes: [] };
    const flota = stats?.flota || { total: 0, disponibles: 0, en_servicio: 0, en_mantenimiento: 0, por_tipo: [] };
    const progresoDia = sol.total > 0 ? Math.round((sol.finalizadas / sol.total) * 100) : 0;

    return (
        <div className="page-enter">
            {/* Métricas principales */}
            <div className="stats-grid">
                <div className="stat-card glass-panel">
                    <div className="stat-card-icon"><Icon name="solicitudes" size={22} /></div>
                    <span className="stat-card-value">{sol.solicitudes_hoy}</span>
                    <span className="stat-card-label">Solicitudes hoy</span>
                </div>
                <div className="stat-card glass-panel">
                    <div className="stat-card-icon stat-icon-warning"><Icon name="clock" size={22} /></div>
                    <span className="stat-card-value">{sol.pendientes}</span>
                    <span className="stat-card-label">Pendientes</span>
                </div>
                <div className="stat-card glass-panel">
                    <div className="stat-card-icon stat-icon-success"><Icon name="truck" size={22} /></div>
                    <span className="stat-card-value">{flota.disponibles}</span>
                    <span className="stat-card-label">Grúas disponibles</span>
                </div>
                <div className="stat-card glass-panel">
                    <div className="stat-card-icon stat-icon-danger"><Icon name="wrench" size={22} /></div>
                    <span className="stat-card-value">{flota.en_mantenimiento}</span>
                    <span className="stat-card-label">En mantenimiento</span>
                </div>
            </div>

            {/* Fila central: Mapa GPS (60%) + Solicitudes Recientes (40%) */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "16px", marginBottom: "16px" }}>
                {/* Mapa GPS */}
                <div className="glass-panel" style={{ height: "420px", padding: 0, overflow: "hidden" }}>
                    {ubicaciones.length === 0 ? (
                        <div className="text-center text-muted" style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                            <Icon name="map" size={40} />
                            <p style={{ margin: 0 }}>No hay grúas activas en este momento.</p>
                            <p style={{ margin: 0, fontSize: "13px" }}>Se actualiza cada 30 segundos.</p>
                        </div>
                    ) : (
                        <MapaGPS ubicaciones={ubicaciones} />
                    )}
                </div>

                {/* Tabla de solicitudes recientes */}
                <div className="glass-panel" style={{ height: "420px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div className="panel-header" style={{ padding: "16px 20px 0", flexShrink: 0 }}>
                        <h3 className="panel-title">Solicitudes Recientes</h3>
                        <a href="/dashboard/solicitudes" className="btn btn-ghost btn-sm">
                            Ver todas <Icon name="arrowRight" size={16} />
                        </a>
                    </div>

                    {(sol.recientes && sol.recientes.length > 0) ? (
                        <div style={{ flex: 1, overflowY: "auto", padding: "0 4px" }}>
                            <table className="data-table" style={{ fontSize: "12px" }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: "10px 12px" }}># Servicio</th>
                                        <th style={{ padding: "10px 12px" }}>Cliente</th>
                                        <th style={{ padding: "10px 12px" }}>Estado</th>
                                        <th style={{ padding: "10px 12px" }}>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sol.recientes.map((s) => (
                                        <tr key={s.id}>
                                            <td style={{ fontWeight: 600, padding: "10px 12px" }}>{s.numero_servicio}</td>
                                            <td style={{ padding: "10px 12px", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.cliente_nombre}</td>
                                            <td style={{ padding: "10px 12px" }}><span className={`badge ${getBadgeClass(s.estado)}`}>{s.estado}</span></td>
                                            <td style={{ padding: "10px 12px" }} className="text-muted">{formatFecha(s.fecha_solicitud)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center text-muted" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                            <Icon name="solicitudes" size={40} />
                            <p style={{ margin: 0 }}>No hay solicitudes registradas aún.</p>
                            <a href="/dashboard/solicitudes" className="btn btn-primary btn-sm">
                                <Icon name="add" size={16} /> Crear solicitud
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Fila inferior: 3 paneles de estadísticas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {/* Progreso del día */}
                <div className="side-panel-card glass-panel">
                    <div className="side-panel-title">
                        <Icon name="chart" size={18} />
                        <span>Progreso del Día</span>
                    </div>
                    <div className="progress-bar-container">
                        <div className="progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${progresoDia}%` }} />
                        </div>
                        <div className="progress-label">
                            <span>{progresoDia}%</span>
                            <span>{sol.finalizadas} de {sol.total}</span>
                        </div>
                    </div>
                </div>

                {/* Flota por tipo */}
                <div className="side-panel-card glass-panel">
                    <div className="side-panel-title">
                        <Icon name="truck" size={18} />
                        <span>Flota por tipo</span>
                    </div>
                    {flota.por_tipo.length > 0 ? flota.por_tipo.map((tipo) => (
                        <div key={tipo.tipo} className="fleet-type-item">
                            <span className="fleet-type-name">{tipo.tipo}</span>
                            <div className="fleet-type-bar">
                                <div className="fleet-type-bar-fill"
                                    style={{ width: `${(tipo.cantidad / Math.max(flota.total, 1)) * 100}%` }} />
                            </div>
                            <span className="fleet-type-count">{tipo.cantidad}</span>
                        </div>
                    )) : (
                        <p className="text-muted" style={{ fontSize: "13px" }}>Sin grúas registradas.</p>
                    )}
                </div>

                {/* Estado de la flota */}
                <div className="side-panel-card glass-panel">
                    <div className="side-panel-title">
                        <Icon name="chart" size={18} />
                        <span>Estado de la Flota</span>
                    </div>
                    <div className="fleet-type-item">
                        <span className="fleet-type-name">Disponible</span>
                        <span className="badge badge-disponible">{flota.disponibles}</span>
                    </div>
                    <div className="fleet-type-item">
                        <span className="fleet-type-name">En servicio</span>
                        <span className="badge badge-en-servicio">{flota.en_servicio}</span>
                    </div>
                    <div className="fleet-type-item">
                        <span className="fleet-type-name">Mantenimiento</span>
                        <span className="badge badge-mantenimiento">{flota.en_mantenimiento}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
