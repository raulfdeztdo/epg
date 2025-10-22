#!/bin/bash

# Instala las dependencias (solo producción para ser más rápido)
npm ci --only=production

# Solo genera la guía si no existe (porque GitHub Actions ya la generó)
if [ ! -f "guide.xml" ]; then
    echo "guide.xml no encontrado, generando..."
    npm run grab --- --channels=sites/movistarplus.es/movistarplus.es.channels.xml --maxConnections=3 --days=2 --timeout=10000
else
    echo "guide.xml ya existe, usando versión de GitHub Actions"
fi