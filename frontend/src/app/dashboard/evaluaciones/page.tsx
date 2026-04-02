"use client";

import { useEffect, useState } from "react";
import { listarEvaluaciones, obtenerPromediosChoferes } from "@/lib/api";
import { Evaluacion, PromedioChofer } from "@/types";
import Icon from "@/components/Icon";
import StarRating from "@/components/StarRating";

export default function EvaluacionesPage() {
    const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
    const [promedios, setPromedios] = useState<PromedioChofer[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroChofer, setFiltroChofer] = useState<number | undefined>(undefined);
    const [error, setError] = useState("");

    async function cargarDatos() {
        setLoading(true);
        try {
            const [resEval, resProm] = await Promise.all([
                listarEvaluaciones(filtroChofer),
                obtenerPromediosChoferes(),
            ]);
            if (resEval.success && resEval.data) setEvaluaciones(resEval.data);
            if (resProm.success && resProm.data) setPromedios(resProm.data);
        } catch { setError("Error al cargar datos."); }
        setLoading(false);
    }

    useEffect(() => { cargarDatos(); }, [filtroChofer]);

    function formatFecha(fecha: string): string {
        return new Date(fecha).toLocaleDateString("es-CR", {
            day: "2-digit", month: "short", year: "numeric"
        });
    }

    return (
        <div className="page-enter">
            {error && <div className="alert alert-error">{error}</div>}

            {promedios.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                    {promedios.map(p => (
                        <div key={p.chofer_id} className="glass-panel"
                            style={{ padding: "16px", textAlign: "center", cursor: "pointer", border: filtroChofer === p.chofer_id ? "2px solid var(--color-primary)" : "2px solid transparent" }}
                            onClick={() => setFiltroChofer(filtroChofer === p.chofer_id ? undefined : p.chofer_id)}>
                            <div style={{ fontWeight: 600, marginBottom: "6px" }}>{p.chofer_nombre}</div>
                            <StarRating value={Math.round(p.promedio)} readonly size={20} />
                            <div style={{ fontSize: "13px", marginTop: "4px" }}>
                                <span style={{ fontWeight: 600 }}>{p.promedio.toFixed(1)}</span>
                                <span className="text-muted"> / 5 — {p.total_evaluaciones} evaluación{p.total_evaluaciones !== 1 ? "es" : ""}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="glass-panel" style={{ padding: "20px" }}>
                <div className="panel-header">
                    <h3 className="panel-title">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                            <Icon name="star" size={22} /> Evaluaciones
                        </span>
                    </h3>
                    {filtroChofer && (
                        <button className="btn btn-ghost" onClick={() => setFiltroChofer(undefined)}>
                            <Icon name="close" size={16} /> Quitar filtro
                        </button>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">Cargando...</div>
                ) : evaluaciones.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center" }} className="text-muted">No hay evaluaciones registradas.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th><th>Solicitud</th><th>Chofer</th>
                                    <th>Cliente</th><th>Calificación</th><th>Comentario</th>
                                </tr>
                            </thead>
                            <tbody>
                                {evaluaciones.map(ev => (
                                    <tr key={ev.id}>
                                        <td className="text-muted">{formatFecha(ev.fecha_creacion)}</td>
                                        <td style={{ fontWeight: 500 }}>{ev.numero_servicio}</td>
                                        <td>{ev.chofer_nombre}</td>
                                        <td>{ev.cliente_nombre}</td>
                                        <td><StarRating value={ev.calificacion} readonly size={18} /></td>
                                        <td className="text-muted" style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {ev.comentario || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
