---
description: Anade un canal al fichero maestro de canales y verifica que se descarga su EPG
---

Anade este canal a la EPG: $ARGUMENTS

Carga antes la skill `xmltv-epg`.

1. Determina de que fuente (`site`) se obtiene el canal y su `site_id`. Mira como estan definidos
   canales similares en `sites/<site>/<site>.channels.xml` y en el fichero maestro.
2. Anadelo a `sites/movistarplus.es/movistarplus.es.channels.xml` (fichero maestro), con el
   atributo `site` correcto, indentacion de 4 espacios y UTF-8. Si el canal pertenece a otra
   fuente, anadelo tambien a su fichero `sites/<site>/<site>.channels.xml`.
3. Si el canal debe aparecer en el dashboard, revisa el mapping de canales a fuentes en
   `frontend/src/data/`.
4. Ejecuta `npm run channels:lint` y `npm run channels:validate` sobre los ficheros modificados.
5. Comprueba que el canal devuelve programas con `npm run grab -- --site=<site> --days=1`.
