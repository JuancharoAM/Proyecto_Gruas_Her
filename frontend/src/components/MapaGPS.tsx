"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { UbicacionActiva } from "@/types";
import Icon from "@/components/Icon";

// Fix: Next.js/webpack rompe las URLs de los íconos por defecto de Leaflet.
function fixLeafletIcons() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
}

// Componente interno con acceso al contexto del mapa para flyTo + popup.
function MapController({ ubicaciones, seleccionado }: { ubicaciones: UbicacionActiva[], seleccionado: number | null }) {
    const map = useMap();

    useEffect(() => {
        if (seleccionado === null) return;
        const u = ubicaciones.find(u => u.camion_id === seleccionado);
        if (!u) return;
        map.flyTo([u.latitud, u.longitud], 15, { duration: 1.2 });
    }, [seleccionado]); // eslint-disable-line react-hooks/exhaustive-deps

    return null;
}

interface MapaGPSProps {
    ubicaciones: UbicacionActiva[];
    seleccionado?: number | null;
}

export default function MapaGPS({ ubicaciones, seleccionado = null }: MapaGPSProps) {
    const markerRefs = useRef<Record<number, L.Marker>>({});

    useEffect(() => {
        fixLeafletIcons();
    }, []);

    // Abrir popup del marker seleccionado tras la animación de flyTo.
    useEffect(() => {
        if (seleccionado === null) return;
        const timer = setTimeout(() => {
            markerRefs.current[seleccionado]?.openPopup();
        }, 1300);
        return () => clearTimeout(timer);
    }, [seleccionado]);

    return (
        <MapContainer
            center={[9.9281, -84.0907]}
            zoom={10}
            style={{ height: "100%", width: "100%", borderRadius: "12px" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController ubicaciones={ubicaciones} seleccionado={seleccionado} />
            {ubicaciones.map((u) => (
                <Marker
                    key={`${u.camion_id}-${u.latitud}-${u.longitud}`}
                    position={[u.latitud, u.longitud]}
                    ref={(ref) => { if (ref) markerRefs.current[u.camion_id] = ref; }}
                >
                    <Popup>
                        <div style={{ lineHeight: "1.8", minWidth: "180px", padding: "4px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <Icon name="truck" size={18} />
                                <strong style={{ fontSize: "14px" }}>{u.placa}</strong>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Icon name="driver" size={14} className="text-muted" />
                                <span>{u.chofer_nombre}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Icon name="solicitudes" size={14} className="text-muted" />
                                <span>{u.numero_servicio}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                <Icon name="contact" size={14} className="text-muted" />
                                <span>{u.cliente_nombre}</span>
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted, #888)", borderTop: "1px solid #eee", paddingTop: "4px" }}>
                                Actualizado: {new Date(u.fecha_reporte).toLocaleTimeString("es-CR")}
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
