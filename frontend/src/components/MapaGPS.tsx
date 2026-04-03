"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { UbicacionActiva } from "@/types";

// Fix: Next.js/webpack rompe las URLs de los íconos por defecto de Leaflet.
// Apuntamos al CDN de unpkg que siempre está disponible.
function fixLeafletIcons() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
}

interface MapaGPSProps {
    ubicaciones: UbicacionActiva[];
}

export default function MapaGPS({ ubicaciones }: MapaGPSProps) {
    useEffect(() => {
        fixLeafletIcons();
    }, []);

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
            {ubicaciones.map((u) => (
                <Marker key={u.camion_id} position={[u.latitud, u.longitud]}>
                    <Popup>
                        <div style={{ lineHeight: "1.6", minWidth: "160px" }}>
                            <strong style={{ fontSize: "14px" }}>🚛 {u.placa}</strong><br />
                            <span>👤 {u.chofer_nombre}</span><br />
                            <span>📋 {u.numero_servicio}</span><br />
                            <span>👥 {u.cliente_nombre}</span><br />
                            <span style={{ fontSize: "11px", color: "#888" }}>
                                Actualizado: {new Date(u.fecha_reporte).toLocaleTimeString("es-CR")}
                            </span>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
