import type { Metadata } from "next";
import "./globals.css";

/**
 * Metadata del sistema — aparece en el título del navegador y SEO
 */
export const metadata: Metadata = {
    title: "Grúas Heredianas — Sistema de Gestión",
    description: "Sistema integral de gestión operativa para Grúas Heredianas Gimome S.A.",
};

/**
 * Layout raíz de la aplicación.
 * Define la estructura HTML base y carga los estilos globales.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body>{children}</body>
        </html>
    );
}
