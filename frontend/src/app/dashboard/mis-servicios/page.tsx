"use client";

import { useEffect, useState } from "react";
import { Solicitud, Evaluacion } from "@/types";
import { listarMisServicios, actualizarEstadoSolicitud, reportarUbicacion, obtenerEvaluacionPorSolicitud } from "@/lib/api";
import Icon from "@/components/Icon";
import StarRating from "@/components/StarRating";

type GpsEstado = 'inactivo' | 'activo' | 'denegado' | 'no-disponible';

export default function MisServiciosPage() {
    const [servicios, setServicios] = useState<Solicitud[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<"Activos" | "Finalizados">("Activos");
    const [submittingId, setSubmittingId] = useState<number | null>(null);
    const [gpsEstado, setGpsEstado] = useState<GpsEstado>('inactivo');

    useEffect(() => {
        cargarServicios();
        const intervalo = setInterval(() => cargarServicios(true), 15000);
        return () => clearInterval(intervalo);
    }, []);

    // Reporte automático de ubicación GPS cada 10s cuando hay un servicio activo
    useEffect(() => {
        const activo = servicios.find(s =>
            s.estado === 'En camino' || s.estado === 'Atendiendo'
        );

        if (!activo || !activo.camion_id) {
            setGpsEstado('inactivo');
            return;
        }

        if (!('geolocation' in navigator)) {
            setGpsEstado('no-disponible');
            return;
        }

        const camionId = activo.camion_id;

        const reportar = () => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setGpsEstado('activo');
                    reportarUbicacion({
                        camion_id: camionId,
                        latitud: pos.coords.latitude,
                        longitud: pos.coords.longitude,
                    }).catch(() => {});
                },
                (err) => {
                    if (err.code === err.PERMISSION_DENIED) {
                        setGpsEstado('denegado');
                    } else {
                        setGpsEstado('no-disponible');
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );
        };

        reportar(); // Reporte inmediato al activarse
        const intervalo = setInterval(reportar, 10000);
        return () => clearInterval(intervalo);
    }, [servicios]);

    async function cargarServicios(silencioso = false) {
        try {
            const res = await listarMisServicios();
            if (res.success && res.data) {
                setServicios(res.data);
            }
        } catch (error) {
            if (!silencioso) {
                console.error(error);
                alert("Error al cargar los servicios");
            }
        } finally {
            if (!silencioso) setLoading(false);
        }
    }

    async function handleActualizarEstado(id: number, nuevoEstado: string) {
        if (!confirm(`¿Estás seguro de pasar este servicio a '${nuevoEstado}'?`)) return;

        setSubmittingId(id);
        try {
            const res = await actualizarEstadoSolicitud(id, nuevoEstado);
            if (res.success && res.data) {
                // Actualizar el estado localmente
                setServicios(servicios.map(s => s.id === id ? res.data! : s));
            } else {
                alert(res.message || "Error al actualizar estado");
            }
        } catch (error: any) {
            alert(error.message || "Ocurrió un error inesperado.");
        } finally {
            setSubmittingId(null);
        }
    }

    const serviciosFiltrados = servicios.filter(s => {
        if (filtro === "Activos") return s.estado !== "Finalizada";
        return s.estado === "Finalizada";
    });

    if (loading) return <div className="page-enter text-muted text-center flex items-center justify-center pt-10">Cargando servicios...</div>;

    return (
        <div className="page-enter">
            {/* Banner de estado GPS */}
            {gpsEstado === 'activo' && (
                <div style={{ background: "var(--color-success-subtle)", border: "1px solid var(--color-success)", borderRadius: "8px", padding: "10px 16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--color-success)" }}>
                    <Icon name="location" size={16} /> Ubicación GPS activa — reportando cada 10 segundos.
                </div>
            )}
            {gpsEstado === 'denegado' && (
                <div style={{ background: "var(--color-danger-subtle)", border: "1px solid var(--color-danger)", borderRadius: "8px", padding: "10px 16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--color-danger)" }}>
                    <Icon name="location" size={16} /> Permiso de ubicación denegado. Ve a los ajustes del navegador y habilita el acceso a la ubicación para esta página.
                </div>
            )}
{gpsEstado === 'no-disponible' && (
                <div style={{ background: "var(--color-warning-subtle)", border: "1px solid var(--color-warning)", borderRadius: "8px", padding: "10px 16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--color-warning)" }}>
                    <Icon name="location" size={16} /> GPS no disponible en este dispositivo o navegador.
                </div>
            )}

            {/* Cabecera / Filtros  */}
            <div className="glass-panel mb-2" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <h3 className="panel-title" style={{ margin: 0 }}>Mis Servicios Asignados</h3>
                <div className="tabs">
                    <button 
                        className={`tab ${filtro === "Activos" ? "tab-active" : ""}`}
                        onClick={() => setFiltro("Activos")}
                    >
                        Servicios Activos
                    </button>
                    <button 
                        className={`tab ${filtro === "Finalizados" ? "tab-active" : ""}`}
                        onClick={() => setFiltro("Finalizados")}
                    >
                        Viajes Finalizados
                    </button>
                </div>
            </div>

            {/* Lista de Tarjetas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {serviciosFiltrados.length === 0 ? (
                    <div className="glass-panel text-center text-muted" style={{ padding: "40px" }}>
                        <Icon name="check-circle" size={48} className="mb-1" />
                        <p>No tienes servicios {filtro.toLowerCase()} en este momento.</p>
                    </div>
                ) : (
                    serviciosFiltrados.map(servicio => (
                        <ServicioCard 
                            key={servicio.id} 
                            servicio={servicio}
                            onActualizar={handleActualizarEstado}
                            isSubmitting={submittingId === servicio.id}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

/**
 * Componente de Tarjeta individual para cada servicio refactorizada bajo el estándar global
 */
function ServicioCard({
    servicio,
    onActualizar,
    isSubmitting
}: {
    servicio: Solicitud,
    onActualizar: (id: number, estado: string) => void,
    isSubmitting: boolean
}) {
    const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);

    // Cargar evaluación solo para servicios finalizados
    useEffect(() => {
        if (servicio.estado !== "Finalizada") return;
        obtenerEvaluacionPorSolicitud(servicio.id)
            .then(res => { if (res.success && res.data) setEvaluacion(res.data); })
            .catch(() => {});
    }, [servicio.id, servicio.estado]);

    let badgeClass = "badge-asignada";
    let statusIcon = "clock";
    if (servicio.estado === "En camino") { badgeClass = "badge-info"; statusIcon = "route"; }
    else if (servicio.estado === "Atendiendo") { badgeClass = "badge-warning"; statusIcon = "wrench"; }
    else if (servicio.estado === "Finalizada") { badgeClass = "badge-success"; statusIcon = "check"; }

    return (
        <div className="glass-panel" style={{ padding: "20px" }}>
            {/* Header Tarjeta */}
            <div className="flex justify-between items-center mb-2" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                <span style={{ fontSize: "16px", fontWeight: "bold" }}>{servicio.numero_servicio}</span>
                <span className={`badge ${badgeClass}`}>
                    <Icon name={statusIcon} size={14} />
                    {servicio.estado}
                </span>
            </div>

            {/* Cuerpo de la tarjeta */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))", gap: "16px", marginBottom: "20px" }}>
                {/* Info Cliente */}
                <div className="flex gap-1" style={{ alignItems: "flex-start" }}>
                    <div className="text-muted"><Icon name="users" size={20} /></div>
                    <div>
                        <div style={{ fontWeight: "600" }}>{servicio.cliente_nombre}</div>
                        {servicio.cliente_telefono && <div className="text-muted" style={{ fontSize: "13px" }}>📞 {servicio.cliente_telefono}</div>}
                    </div>
                </div>

                {/* Ruta */}
                <div className="flex gap-1" style={{ alignItems: "flex-start" }}>
                    <div className="text-muted"><Icon name="location" size={20} /></div>
                    <div style={{ fontSize: "14px" }}>
                        <div style={{ color: "var(--color-primary)", fontWeight: "500" }}>{servicio.ubicacion_origen}</div>
                        {servicio.ubicacion_destino && (
                            <>
                                <div style={{ margin: "2px 0", borderLeft: "2px solid var(--border-color)", height: "10px", marginLeft: "4px" }}></div>
                                <div style={{ fontWeight: "500" }}>{servicio.ubicacion_destino}</div>
                            </>
                        )}
                    </div>
                </div>

                {/* Camion */}
                <div className="flex gap-1" style={{ alignItems: "flex-start" }}>
                    <div className="text-muted"><Icon name="truck" size={20} /></div>
                    <div style={{ fontSize: "14px" }}>
                        <div>Grúa: <strong>{servicio.camion_placa}</strong></div>
                        <div className="text-muted">Servicio: {servicio.tipo_servicio}</div>
                    </div>
                </div>
            </div>

            {servicio.descripcion_problema && (
                <div className="mb-2" style={{ backgroundColor: "var(--bg-subtle)", padding: "12px", borderRadius: "8px", fontSize: "13px", fontStyle: "italic" }}>
                    📝 {servicio.descripcion_problema}
                </div>
            )}

            {/* Panel de Acciones con diseño touch friendly pero usando botones globales */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                {servicio.estado === "Asignada" && (
                    <button 
                        className="btn btn-primary" 
                        style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "16px" }}
                        onClick={() => onActualizar(servicio.id, "En camino")}
                        disabled={isSubmitting}
                    >
                        <Icon name="play" size={20} /> Iniciar Viaje (En Camino)
                    </button>
                )}

                {servicio.estado === "En camino" && (
                    <button 
                        className="btn btn-warning" 
                        style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "16px", backgroundColor: "#f59e0b", color: "#fff", border: "none" }}
                        onClick={() => onActualizar(servicio.id, "Atendiendo")}
                        disabled={isSubmitting}
                    >
                        <Icon name="wrench" size={20} /> Llegué al Sitio (Atendiendo)
                    </button>
                )}

                {servicio.estado === "Atendiendo" && (
                    <button 
                        className="btn btn-success" 
                        style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "16px" }}
                        onClick={() => onActualizar(servicio.id, "Finalizada")}
                        disabled={isSubmitting}
                    >
                        <Icon name="check-circle" size={20} /> Finalizar Servicio
                    </button>
                )}

                {servicio.estado === "Finalizada" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {/* Fecha de completado */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", backgroundColor: "var(--bg-subtle)", borderRadius: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                            <Icon name="check-circle" size={16} />
                            Completado el {new Date(servicio.fecha_finalizacion!).toLocaleDateString("es-CR", { day: "2-digit", month: "long", year: "numeric" })}
                        </div>

                        {/* Evaluación del cliente */}
                        {evaluacion ? (
                            <div style={{ padding: "14px 16px", border: "1px solid var(--border-color)", borderRadius: "10px", background: "var(--bg-surface)" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                                        Evaluación del cliente
                                    </span>
                                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                                        {new Date(evaluacion.fecha_creacion).toLocaleDateString("es-CR")}
                                    </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: evaluacion.comentario ? "10px" : 0 }}>
                                    <StarRating value={evaluacion.calificacion} readonly size={22} />
                                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#f5a623" }}>
                                        {evaluacion.calificacion}/5
                                    </span>
                                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                        por {evaluacion.cliente_nombre}
                                    </span>
                                </div>
                                {evaluacion.comentario && (
                                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontStyle: "italic", padding: "8px 12px", background: "var(--bg-subtle)", borderRadius: "6px", borderLeft: "3px solid #f5a623" }}>
                                        "{evaluacion.comentario}"
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ padding: "10px 14px", border: "1px dashed var(--border-color)", borderRadius: "8px", fontSize: "13px", color: "var(--text-secondary)", textAlign: "center" }}>
                                Sin evaluación aún
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
