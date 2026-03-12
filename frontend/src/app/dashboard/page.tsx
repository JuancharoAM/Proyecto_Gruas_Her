"use client";

/**
 * ============================================================================
 * Página del Dashboard Principal
 * ============================================================================
 * Resumen operativo con métricas, panel lateral y tabla de solicitudes.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { obtenerEstadisticas } from "@/lib/api";
import { DashboardStats } from "@/types";
import Icon from "@/components/Icon";

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userData = localStorage.getItem("usuario");
        if (userData) {
            const usuario = JSON.parse(userData);
            if (usuario.rol === "Chofer") {
                window.location.href = "/dashboard/mis-servicios";
                return;
            }
        }
        async function cargarDatos() {
            try {
                const response = await obtenerEstadisticas();
                if (response.success && response.data) setStats(response.data);
            } catch (error) {
                console.error("Error al cargar estadísticas:", error);
            } finally {
                setLoading(false);
            }
        }
        cargarDatos();
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

            {/* Layout de dos columnas */}
            <div className="dashboard-columns">
                <div className="dashboard-side-panel">
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

                {/* Tabla de solicitudes recientes */}
                <div className="dashboard-main-panel glass-panel">
                    <div className="panel-header">
                        <h3 className="panel-title">Solicitudes Recientes</h3>
                        <a href="/dashboard/solicitudes" className="btn btn-ghost btn-sm">
                            Ver todas <Icon name="arrowRight" size={16} />
                        </a>
                    </div>

                    {(sol.recientes && sol.recientes.length > 0) ? (
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th># Servicio</th>
                                        <th>Cliente</th>
                                        <th>Origen</th>
                                        <th>Grúa</th>
                                        <th>Estado</th>
                                        <th>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sol.recientes.map((s) => (
                                        <tr key={s.id}>
                                            <td style={{ fontWeight: 600 }}>{s.numero_servicio}</td>
                                            <td>{s.cliente_nombre}</td>
                                            <td>{s.ubicacion_origen}</td>
                                            <td>{s.camion_placa || "—"}</td>
                                            <td><span className={`badge ${getBadgeClass(s.estado)}`}>{s.estado}</span></td>
                                            <td className="text-muted">{formatFecha(s.fecha_solicitud)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center text-muted" style={{ padding: "40px 0" }}>
                            <Icon name="solicitudes" size={40} />
                            <p className="mt-1">No hay solicitudes registradas aún.</p>
                            <a href="/dashboard/solicitudes" className="btn btn-primary btn-sm mt-2">
                                <Icon name="add" size={16} /> Crear solicitud
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
