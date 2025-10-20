#!/bin/bash

# Instala las dependencias (solo producción para ser más rápido)
npm ci --only=production

# Ejecuta el comando grab para movistarplus.es con optimizaciones
npm run grab --- --channels=sites/movistarplus.es/movistarplus.es.channels.xml --maxConnections=3 --days=2 --timeout=10000