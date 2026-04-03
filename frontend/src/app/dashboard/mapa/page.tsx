"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { UbicacionActiva } from "@/types";
import { listarUbicacionesActivas } from "@/lib/api";

// Importación dinámica sin SSR: Leaflet usa window/document que no existen en servidor
const MapaGPS = dynamic(() => import("../../../components/MapaGPS"), { ssr: false });

export default function MapaPage() {
    const [ubicaciones, setUbicaciones] = useState<UbicacionActiva[]>([]);
    const [loading, setLoading] = useState(true);
    const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

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
        const intervalo = setInterval(() => cargarUbicaciones(true), 30000);
        return () => clearInterval(intervalo);
    }, []);

    if (loading) return (
        <div className="page-enter text-muted text-center flex items-center justify-center pt-10">
            Cargando mapa...
        </div>
    );

    return (
        <div className="page-enter" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", gap: "12px" }}>
            {/* Cabecera */}
            <div className="glass-panel" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
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

            {/* Mapa o estado vacío */}
            {ubicaciones.length === 0 ? (
                <div className="glass-panel text-center text-muted" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.3 }}>
                        <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
                    </svg>
                    <p>No hay grúas activas en este momento.</p>
                    <p style={{ fontSize: "13px" }}>El mapa se actualizará automáticamente cada 30 segundos.</p>
                </div>
            ) : (
                <div className="glass-panel" style={{ flex: 1, padding: "0", overflow: "hidden" }}>
                    <MapaGPS ubicaciones={ubicaciones} />
                </div>
            )}
        </div>
    );
}
