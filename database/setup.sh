#!/bin/bash
# =============================================================================
# Script de inicialización de SQL Server para Docker
# =============================================================================
# Este script espera a que SQL Server esté listo y luego ejecuta el init.sql
# para crear la base de datos y las tablas.
#
# Se ejecuta como un proceso secundario mientras SQL Server arranca.
# =============================================================================

echo "⏳ Esperando a que SQL Server esté listo..."

# Esperar hasta 60 segundos a que SQL Server acepte conexiones
for i in {1..60}; do
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" -C -No > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ SQL Server está listo."
        break
    fi
    echo "   Intento $i/60 — esperando..."
    sleep 2
done

# Ejecutar el script de inicialización
echo "🔄 Ejecutando script de inicialización..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -i /docker-entrypoint-initdb.d/init.sql -C -No

if [ $? -eq 0 ]; then
    echo "✅ Base de datos inicializada correctamente."
else
    echo "❌ Error al ejecutar el script de inicialización."
fi
