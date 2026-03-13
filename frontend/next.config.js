/** @type {import('next').NextConfig} */
const nextConfig = {
    // Variables de entorno públicas (sin fallback para que se resuelva dinámicamente en el navegador)
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    },
    // Modo standalone para Docker
    output: 'standalone',
};

module.exports = nextConfig;
