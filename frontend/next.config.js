/** @type {import('next').NextConfig} */
const nextConfig = {
    // Configuración de variables de entorno públicas
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    },
    // Modo standalone para Docker
    output: 'standalone',
};

module.exports = nextConfig;
