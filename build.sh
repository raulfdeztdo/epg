#!/bin/bash

# Instala las dependencias
npm install

# Ejecuta el comando grab para movistarplus.es con un cron cada 5 minutos
npm run grab --- --site=movistarplus.es --cron="*/5 * * * *"