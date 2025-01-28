#!/bin/bash

# Instala las dependencias
npm install

# Ejecuta el comando grab para movistarplus.es
npm run grab --- --channels=sites/movistarplus.es/movistarplus.es.channels.xml --maxConnections=5