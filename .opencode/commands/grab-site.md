---
description: Descarga la EPG de un solo site y comprueba que el parser devuelve datos validos
---

Prueba el grabber contra un unico site: $ARGUMENTS

Sites disponibles: `movistarplus.es`, `orangetv.orange.es`, `programacion-tv.elpais.com`.
Si no se indica ninguno, pregunta cual usar.

1. Ejecuta `npm run grab -- --site=<site> --days=1 --maxConnections=3 --timeout=10000`.
2. Revisa la salida del comando: canales procesados, numero de programas y errores o timeouts.
3. Inspecciona `guide.xml` sin leerlo entero (pesa varios MB): usa `grep -c "<programme"` y
   `head`/`grep` sobre algun canal del site para comprobar titulo, horas `start`/`stop`,
   descripcion y categoria.
4. Informa de canales sin programas, horas solapadas o descripciones vacias.

`guide.xml` esta en `.gitignore` y lo regenera el GitHub Action: no lo anadas a ningun commit.
