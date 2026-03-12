"use client";

import { useEffect, useState } from "react";
import { Solicitud } from "@/types";
import { listarMisServicios, actualizarEstadoSolicitud } from "@/lib/api";
import Icon from "@/components/Icon";

export default function MisServiciosPage() {
    const [servicios, setServicios] = useState<Solicitud[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<"Activos" | "Finalizados">("Activos");
    const [submittingId, setSubmittingId] = useState<number | null>(null);

    useEffect(() => {
        cargarServicios();
    }, []);

    async function cargarServicios() {
        try {
            const res = await listarMisServicios();
            if (res.success && res.data) {
                setServicios(res.data);
            }
        } catch (error) {
            console.error(error);
            alert("Error al cargar los servicios");
        } finally {
            setLoading(false);
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
                    <div className="text-center text-muted" style={{ padding: "10px", backgroundColor: "var(--bg-subtle)", borderRadius: "8px" }}>
                        <Icon name="check-circle" size={16} /> Completado el {new Date(servicio.fecha_finalizacion!).toLocaleDateString("es-CR")}
                    </div>
                )}
            </div>
        </div>
    );
}
