"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { UbicacionActiva } from "@/types";
import { listarUbicacionesActivas } from "@/lib/api";
import Icon from "@/components/Icon";

// Importación dinámica sin SSR: Leaflet usa window/document que no existen en servidor
const MapaGPS = dynamic(() => import("../../../components/MapaGPS"), { ssr: false });

export default function MapaPage() {
    const [ubicaciones, setUbicaciones] = useState<UbicacionActiva[]>([]);
    const [loading, setLoading] = useState(true);
    const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
    const [seleccionado, setSeleccionado] = useState<number | null>(null);

    async function cargarUbicaciones(silencioso = false) {
        try {
            const data = await listarUbicacionesActivas();
            setUbicaciones(data);
            setUltimaActualizacion(new Date());
        } catch (error) {
            if (!silencioso) console.error("Error al cargar ubicaciones:", error);
        } finally {
            if (!silencioso) setLoading(false);
        }
    }

    useEffect(() => {
        cargarUbicaciones();
        const intervalo = setInterval(() => cargarUbicaciones(true), 10000);
        return () => clearInterval(intervalo);
    }, []);

    function handleSeleccionar(camionId: number) {
        // Si ya estaba seleccionado, deseleccionar (toggle)
        setSeleccionado(prev => prev === camionId ? null : camionId);
    }

    if (loading) return (
        <div className="page-enter text-muted text-center flex items-center justify-center pt-10">
            Cargando mapa...
        </div>
    );

    return (
        <div className="page-enter" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", gap: "12px" }}>
            {/* Cabecera */}
            <div className="glass-panel" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", flexShrink: 0 }}>
                <div>
                    <h3 className="panel-title" style={{ margin: 0 }}>Mapa GPS — Grúas Activas</h3>
                    <p className="text-muted" style={{ margin: 0, fontSize: "13px" }}>
                        {ubicaciones.length} grúa{ubicaciones.length !== 1 ? "s" : ""} activa{ubicaciones.length !== 1 ? "s" : ""} en este momento
                    </p>
                </div>
                {ultimaActualizacion && (
                    <span className="text-muted" style={{ fontSize: "12px" }}>
                        Actualizado: {ultimaActualizacion.toLocaleTimeString("es-CR")}
                    </span>
                )}
            </div>

            {/* Cuerpo: lista lateral + mapa */}
            {ubicaciones.length === 0 ? (
                <div className="glass-panel text-center text-muted" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.3 }}>
                        <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
                    </svg>
                    <p>No hay grúas activas en este momento.</p>
                    <p style={{ fontSize: "13px" }}>El mapa se actualizará automáticamente cada 10 segundos.</p>
                </div>
            ) : (
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr", gap: "12px", minHeight: 0 }}>
                    {/* Panel de accesos rápidos */}
                    <div className="glass-panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                                Acceso rápido
                            </p>
                            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-muted)" }}>
                                Clic para centrar en el mapa
                            </p>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                            {ubicaciones.map((u) => {
                                const activo = seleccionado === u.camion_id;
                                return (
                                    <button
                                        key={u.camion_id}
                                        onClick={() => handleSeleccionar(u.camion_id)}
                                        style={{
                                            width: "100%",
                                            textAlign: "left",
                                            background: activo ? "var(--color-primary)" : "transparent",
                                            border: activo ? "none" : "1px solid var(--border-color)",
                                            borderRadius: "8px",
                                            padding: "10px 12px",
                                            marginBottom: "6px",
                                            cursor: "pointer",
                                            color: activo ? "#fff" : "var(--text-primary)",
                                            transition: "all 0.15s ease",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                            <Icon name="truck" size={15} />
                                            <span style={{ fontWeight: 700, fontSize: "14px" }}>{u.placa}</span>
                                        </div>
                                        <div style={{ fontSize: "12px", opacity: activo ? 0.9 : 0.75, lineHeight: 1.5 }}>
                                            <div>👤 {u.chofer_nombre}</div>
                                            <div>📋 {u.numero_servicio}</div>
                                            <div style={{ fontSize: "11px", opacity: 0.8 }}>
                                                {new Date(u.fecha_reporte).toLocaleTimeString("es-CR")}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mapa */}
                    <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
                        <MapaGPS ubicaciones={ubicaciones} seleccionado={seleccionado} />
                    </div>
                </div>
            )}
        </div>
    );
}
