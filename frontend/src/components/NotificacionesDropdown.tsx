"use client";

/**
 * ============================================================================
 * Componente NotificacionesDropdown
 * ============================================================================
 * Campana de notificaciones con badge y dropdown desplegable.
 * Se ubica en el header del dashboard.
 * - Muestra badge con cantidad de no leidas
 * - Polling cada 30 segundos para nuevas notificaciones
 * - Dropdown con lista de notificaciones recientes
 * - Acciones: marcar como leida, marcar todas, eliminar
 * - Responsive: en movil ocupa pantalla completa como panel
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Notificacion } from "@/types";
import {
    listarNotificaciones,
    contarNotificacionesNoLeidas,
    marcarNotificacionLeida,
    marcarTodasNotificacionesLeidas,
    limpiarNotificaciones,
} from "@/lib/api";
import Icon from "./Icon";

export default function NotificacionesDropdown() {
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
    const [noLeidas, setNoLeidas] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    /** Detectar si estamos en movil (1024px = mismo breakpoint que dashboard.css) */
    useEffect(() => {
        setMounted(true);
        function checkMobile() {
            setIsMobile(window.innerWidth <= 1024);
        }
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    /** Cargar conteo de no leidas */
    const cargarConteo = useCallback(async () => {
        try {
            const res = await contarNotificacionesNoLeidas();
            if (res.success && res.data) {
                setNoLeidas(res.data.total);
            }
        } catch (e) {
            // Silenciar errores de polling
        }
    }, []);

    /** Cargar lista completa de notificaciones */
    const cargarNotificaciones = useCallback(async () => {
        setCargando(true);
        try {
            const res = await listarNotificaciones();
            if (res.success && res.data) {
                setNotificaciones(res.data);
                setNoLeidas(res.data.filter((n) => !n.leida).length);
            }
        } catch (e) {
            console.error("Error al cargar notificaciones:", e);
        }
        setCargando(false);
    }, []);

    /** Polling cada 30 segundos para el conteo */
    useEffect(() => {
        cargarConteo();
        const interval = setInterval(cargarConteo, 30000);
        return () => clearInterval(interval);
    }, [cargarConteo]);

    /** Ref para el panel (usado en portal para cerrar al click fuera) */
    const panelRef = useRef<HTMLDivElement>(null);

    /** Cerrar dropdown al hacer clic/tap fuera (solo desktop, movil usa boton volver) */
    useEffect(() => {
        if (isMobile) return;
        function handleClickOutside(e: MouseEvent | TouchEvent) {
            const target = e.target as Node;
            if (dropdownRef.current && dropdownRef.current.contains(target)) return;
            if (panelRef.current && panelRef.current.contains(target)) return;
            setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [isMobile]);

    /** Bloquear scroll del body cuando el panel movil esta abierto (iOS-safe) */
    useEffect(() => {
        if (isOpen && isMobile) {
            const scrollY = window.scrollY;
            document.body.style.position = "fixed";
            document.body.style.top = `-${scrollY}px`;
            document.body.style.left = "0";
            document.body.style.right = "0";
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.position = "";
                document.body.style.top = "";
                document.body.style.left = "";
                document.body.style.right = "";
                document.body.style.overflow = "";
                window.scrollTo(0, scrollY);
            };
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isOpen, isMobile]);

    /** Toggle dropdown */
    function toggleDropdown() {
        if (!isOpen) {
            cargarNotificaciones();
        }
        setIsOpen(!isOpen);
    }

    /** Marcar una como leida */
    async function handleMarcarLeida(id: number) {
        await marcarNotificacionLeida(id);
        setNotificaciones((prev) =>
            prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
        );
        setNoLeidas((prev) => Math.max(0, prev - 1));
    }

    /** Marcar todas como leidas */
    async function handleMarcarTodas() {
        await marcarTodasNotificacionesLeidas();
        setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
        setNoLeidas(0);
    }

    /** Limpiar (eliminar) todas las notificaciones */
    async function handleLimpiarTodas() {
        await limpiarNotificaciones();
        setNotificaciones([]);
        setNoLeidas(0);
    }

    /** Formatear fecha relativa */
    function formatearFecha(fecha: string): string {
        const diff = Date.now() - new Date(fecha).getTime();
        const minutos = Math.floor(diff / 60000);
        if (minutos < 1) return "Ahora";
        if (minutos < 60) return `Hace ${minutos}m`;
        const horas = Math.floor(minutos / 60);
        if (horas < 24) return `Hace ${horas}h`;
        const dias = Math.floor(horas / 24);
        if (dias < 7) return `Hace ${dias}d`;
        return new Date(fecha).toLocaleDateString("es-CR");
    }

    /** Color del icono segun tipo */
    function colorTipo(tipo: string): string {
        switch (tipo) {
            case "asignacion": return "var(--color-primary)";
            case "estado": return "var(--color-warning, #f59e0b)";
            case "mantenimiento": return "var(--color-danger, #ef4444)";
            case "alerta": return "var(--color-danger, #ef4444)";
            default: return "var(--text-secondary)";
        }
    }

    /** Icono segun tipo */
    function iconoTipo(tipo: string): string {
        switch (tipo) {
            case "asignacion": return "assign";
            case "estado": return "route";
            case "mantenimiento": return "wrench";
            case "alerta": return "bell";
            default: return "bell";
        }
    }

    /** Calcular posicion del dropdown desktop relativa al boton campana */
    const [desktopPos, setDesktopPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

    useEffect(() => {
        if (isOpen && !isMobile && dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            setDesktopPos({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            });
        }
    }, [isOpen, isMobile]);

    /** Estilos del panel: desktop vs movil — ambos usan position fixed via portal */
    const panelStyle: React.CSSProperties = isMobile
        ? {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            zIndex: 2000,
            borderRadius: 0,
            boxShadow: "none",
            border: "none",
            background: "var(--bg-surface, #ffffff)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }
        : {
            position: "fixed",
            top: `${desktopPos.top}px`,
            right: `${desktopPos.right}px`,
            width: "380px",
            maxHeight: "480px",
            overflowY: "auto",
            zIndex: 2000,
            borderRadius: "var(--radius-lg, 12px)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
            border: "1px solid var(--border-color, rgba(0,0,0,0.12))",
            background: "var(--bg-surface, #ffffff)",
        };

    return (
        <div className="notificaciones-dropdown" ref={dropdownRef} style={{ position: "relative" }}>
            {/* Boton campana */}
            <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={toggleDropdown}
                title="Notificaciones"
                style={{ position: "relative", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
                <Icon name="bell" size={18} />
                {noLeidas > 0 && (
                    <span
                        style={{
                            position: "absolute",
                            top: "2px",
                            right: "2px",
                            background: "var(--color-danger, #ef4444)",
                            color: "white",
                            borderRadius: "50%",
                            width: noLeidas > 9 ? "20px" : "16px",
                            height: "16px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                        }}
                    >
                        {noLeidas > 99 ? "99+" : noLeidas}
                    </span>
                )}
            </button>

            {/* Dropdown / Panel — renderizado via portal para escapar el backdrop-filter del header */}
            {isOpen && mounted && createPortal(
                <div ref={panelRef} style={panelStyle}>
                    {/* Header del dropdown */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: isMobile ? "16px" : "14px 16px",
                            borderBottom: "1px solid var(--border-color, rgba(0,0,0,0.1))",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {isMobile && (
                                <button
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--text-primary)",
                                        padding: "8px",
                                        display: "flex",
                                        alignItems: "center",
                                        touchAction: "manipulation",
                                        minWidth: "44px",
                                        minHeight: "44px",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Icon name="arrowRight" size={20} className="icon-back" />
                                </button>
                            )}
                            <h4 style={{ margin: 0, fontSize: isMobile ? "17px" : "15px", fontWeight: 600 }}>
                                Notificaciones
                                {noLeidas > 0 && (
                                    <span style={{ color: "var(--text-secondary)", fontWeight: 400, marginLeft: "6px", fontSize: "14px" }}>
                                        ({noLeidas})
                                    </span>
                                )}
                            </h4>
                        </div>
                        <div style={{ display: "flex", gap: "4px" }}>
                            {noLeidas > 0 && (
                                <button
                                    onClick={handleMarcarTodas}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--color-primary)",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        fontWeight: 500,
                                        padding: "4px 8px",
                                        borderRadius: "var(--radius-sm, 6px)",
                                    }}
                                >
                                    Marcar todas
                                </button>
                            )}
                            {notificaciones.length > 0 && (
                                <button
                                    onClick={handleLimpiarTodas}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--color-danger, #ef4444)",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        fontWeight: 500,
                                        padding: "4px 8px",
                                        borderRadius: "var(--radius-sm, 6px)",
                                    }}
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Lista de notificaciones */}
                    {cargando ? (
                        <div style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)" }}>
                            Cargando...
                        </div>
                    ) : notificaciones.length === 0 ? (
                        <div style={{ padding: "48px 32px", textAlign: "center", color: "var(--text-secondary)" }}>
                            <Icon name="bell-off" size={40} />
                            <p style={{ marginTop: "12px", fontSize: "14px" }}>Sin notificaciones</p>
                        </div>
                    ) : (
                        <div>
                            {notificaciones.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => !n.leida && handleMarcarLeida(n.id)}
                                    style={{
                                        display: "flex",
                                        gap: "12px",
                                        padding: isMobile ? "14px 16px" : "12px 16px",
                                        cursor: n.leida ? "default" : "pointer",
                                        borderBottom: "1px solid var(--border-color, rgba(0,0,0,0.05))",
                                        background: n.leida ? "transparent" : "var(--bg-highlight, rgba(59, 130, 246, 0.05))",
                                        transition: "background 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!n.leida) (e.currentTarget.style.background = "var(--bg-hover, rgba(0,0,0,0.03))");
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!n.leida) (e.currentTarget.style.background = "var(--bg-highlight, rgba(59, 130, 246, 0.05))");
                                    }}
                                >
                                    {/* Icono tipo */}
                                    <div
                                        style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                            background: `${colorTipo(n.tipo)}15`,
                                            color: colorTipo(n.tipo),
                                        }}
                                    >
                                        <Icon name={iconoTipo(n.tipo)} size={18} />
                                    </div>

                                    {/* Contenido */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: "13px",
                                            fontWeight: n.leida ? 400 : 600,
                                            color: "var(--text-primary)",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}>
                                            {n.titulo}
                                        </div>
                                        <div style={{
                                            fontSize: "12px",
                                            color: "var(--text-secondary)",
                                            marginTop: "2px",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: isMobile ? "normal" : "nowrap",
                                        }}>
                                            {n.mensaje}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "var(--text-muted, #999)", marginTop: "4px" }}>
                                            {formatearFecha(n.fecha_creacion)}
                                        </div>
                                    </div>

                                    {/* Indicador no leida */}
                                    {!n.leida && (
                                        <div style={{
                                            width: "8px",
                                            height: "8px",
                                            borderRadius: "50%",
                                            background: "var(--color-primary)",
                                            flexShrink: 0,
                                            marginTop: "6px",
                                        }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
