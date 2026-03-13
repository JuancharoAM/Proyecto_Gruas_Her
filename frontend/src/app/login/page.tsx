"use client";

/**
 * ============================================================================
 * Página de Login — Inicio de Sesión
 * ============================================================================
 * Formulario de autenticación con diseño minimalista y degradados.
 * Incluye toggle de tema claro/oscuro.
 * ============================================================================
 */

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import Icon from "@/components/Icon";
import "./login.css";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    /** Cargar preferencia de tema al montar */
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") {
            setDarkMode(true);
            document.documentElement.setAttribute("data-theme", "dark");
        }
    }, []);

    /** Alternar entre modo claro y oscuro */
    function toggleDarkMode() {
        const newMode = !darkMode;
        setDarkMode(newMode);
        document.documentElement.setAttribute("data-theme", newMode ? "dark" : "light");
        localStorage.setItem("theme", newMode ? "dark" : "light");
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await login(email, password);
            if (response.success && response.data) {
                const rol = response.data.usuario.rol;
                localStorage.setItem("token", response.data.token);
                localStorage.setItem("usuario", JSON.stringify(response.data.usuario));

                if (rol === "Chofer") {
                    router.push("/dashboard/mis-servicios");
                } else if (rol === "Cliente") {
                    router.push("/dashboard/mis-solicitudes");
                } else {
                    router.push("/dashboard");
                }
            } else {
                setError(response.message || "Credenciales inválidas.");
            }
        } catch (err) {
            setError("Error al conectar con el servidor.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-container">
            <div className="login-bg" />

            {/* Toggle de tema en esquina superior derecha */}
            <button className="login-theme-toggle" onClick={toggleDarkMode}
                title={darkMode ? "Modo claro" : "Modo oscuro"}>
                <Icon name={darkMode ? "sun" : "moon"} size={18} />
            </button>

            <div className="login-card glass-panel-solid page-enter">
                <div className="login-header">
                    <div className="login-logo">
                        <Icon name="crane" size={32} />
                    </div>
                    <h1 className="login-title">Grúas Heredianas</h1>
                    <p className="login-subtitle">Sistema de Gestión Operativa</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Correo electrónico</label>
                        <input id="email" type="email" className="form-input"
                            placeholder="admin@gruasheredianas.com"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            required autoFocus />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Contraseña</label>
                        <input id="password" type="password" className="form-input"
                            placeholder="••••••••"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            required />
                    </div>

                    <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                        {loading ? "Ingresando..." : "Iniciar Sesión"}
                    </button>
                </form>

                <p className="login-footer text-muted text-center mt-2">
                    Grúas Heredianas Gimome S.A. © 2026
                </p>
            </div>
        </div>
    );
}
