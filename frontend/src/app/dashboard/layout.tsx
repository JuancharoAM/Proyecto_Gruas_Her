"use client";

/**
 * ============================================================================
 * Layout del Dashboard
 * ============================================================================
 * Contenedor principal que envuelve todas las páginas del dashboard.
 * Incluye un Sidebar fijo y un Header con información del usuario.
 * Protege las rutas mediante validación de token y rol.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Usuario } from "@/types";
import Icon from "@/components/Icon";
import NotificacionesDropdown from "@/components/NotificacionesDropdown";
import "./dashboard.css";

/** Elementos del menú con iconos SVG */
const menuItems = [
    { href: "/dashboard", label: "Inicio", icon: "dashboard",
      roles: ["Administrador", "Logística", "Técnico"] },
    { href: "/dashboard/solicitudes", label: "Solicitudes", icon: "solicitudes",
      roles: ["Administrador", "Logística"] },
    { href: "/dashboard/camiones", label: "Flota", icon: "truck",
      roles: ["Administrador", "Logística"] },
    { href: "/dashboard/choferes", label: "Choferes", icon: "driver",
      roles: ["Administrador", "Logística"] },
    { href: "/dashboard/clientes", label: "Clientes", icon: "contact",
      roles: ["Administrador", "Logística"] },
    { href: "/dashboard/mantenimiento", label: "Mantenimiento", icon: "wrench",
      roles: ["Administrador", "Técnico"] },
    { href: "/dashboard/reportes", label: "Reportes", icon: "chart",
      roles: ["Administrador", "Logística"] },
    { href: "/dashboard/facturacion", label: "Facturación", icon: "invoice",
      roles: ["Administrador"] },
    { href: "/dashboard/evaluaciones", label: "Evaluaciones", icon: "star",
      roles: ["Administrador", "Logística"] },
    { href: "/dashboard/usuarios", label: "Usuarios", icon: "users",
      roles: ["Administrador"] },
    { href: "/dashboard/mis-servicios", label: "Mis Servicios", icon: "route",
      roles: ["Chofer"] },
    { href: "/dashboard/mis-solicitudes", label: "Mis Solicitudes", icon: "solicitudes",
      roles: ["Cliente"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [theme, setTheme] = useState("light");

    /** Validación de sesión y carga de tema */
    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("usuario");
        const savedTheme = localStorage.getItem("theme") || "light";

        // Aplicar tema
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);

        if (!token || !userData) {
            router.push("/login");
        } else {
            setUsuario(JSON.parse(userData));
        }
    }, [router]);

    /** Cerrar sesión de forma limpia */
    function handleLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        router.push("/login");
    }

    /** Cambiar tema claro/oscuro internamente */
    function toggleTheme() {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
    }

    // Mientras valida la sesión, no monta el contenido (evita destellos de rutas protegidas)
    if (!usuario) return <div className="skeleton" style={{ width: "100vw", height: "100vh" }} />;

    return (
        <div className="layout-container">

            {/* ========= Overlay móvil ========= */}
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ========= Sidebar ========= */}
            <aside className={`sidebar glass-panel-solid ${isSidebarOpen ? "open" : ""} ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
                <div className="sidebar-header" style={{ justifyContent: "space-between", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                        <Icon name="crane" size={28} />
                        {!isSidebarCollapsed && (
                            <span className="sidebar-title" title="Grúas Heredianas" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                Grúas Heredianas
                            </span>
                        )}
                    </div>
                </div>

                {!isSidebarCollapsed && (
                    <button className="sidebar-toggle hidden-mobile" onClick={() => setSidebarCollapsed(true)} title="Ocultar menú">
                        <Icon name="menu" size={16} /> Colapsar Menú
                    </button>
                )}
                {isSidebarCollapsed && (
                    <button className="sidebar-toggle hidden-mobile" onClick={() => setSidebarCollapsed(false)} title="Mostrar menú" style={{ display: "flex", justifyContent: "center" }}>
                        <Icon name="menu" size={16} />
                    </button>
                )}

                <nav className="sidebar-nav" style={{ marginTop: "16px" }}>
                    {menuItems.map((item) => {
                        // Ocultar si el rol del usuario no está en la lista permitida
                        if (!item.roles.includes(usuario.rol)) return null;

                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
                                title={isSidebarCollapsed ? item.label : ""}
                            >
                                <div className="sidebar-icon"><Icon name={item.icon || "dashboard"} size={20} /></div>
                                {!isSidebarCollapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <button className="sidebar-link text-danger" onClick={handleLogout} style={{width:"100%", justifyContent: isSidebarCollapsed ? "center" : "flex-start"}} title="Cerrar Sesión">
                        <div className="sidebar-icon"><Icon name="logout" size={20} /></div>
                        {!isSidebarCollapsed && <span>Cerrar Sesión</span>}
                    </button>
                    {!isSidebarCollapsed && <div className="sidebar-version text-muted">v2.0.0 Alpha</div>}
                </div>
            </aside>

            {/* ========= Contenido Principal ========= */}
            <main className="main-content">

                {/* Header Superior */}
                <header className="header glass-panel">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>
                            <Icon name="menu" size={24} />
                        </button>
                    </div>

                    <div className="header-right">
                        <NotificacionesDropdown />
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={toggleTheme} title={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}>
                            <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
                        </button>
                        
                        <div className="user-profile" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div className="user-avatar" style={{ background: "var(--color-primary)", color: "white", padding: "8px 12px", borderRadius: "var(--radius-full)", fontWeight: "bold" }}>
                                {usuario.nombre.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="user-info hide-mobile" style={{ flexDirection: "column" }}>
                                <span className="user-name" style={{ fontSize: "14px", fontWeight: "bold" }}>{usuario.nombre}</span>
                                <span className="user-role text-muted" style={{ fontSize: "12px" }}>{usuario.rol}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Vistas Anidadas */}
                <div className="page-wrapper">
                    {children}
                </div>
            </main>
        </div>
    );
}
