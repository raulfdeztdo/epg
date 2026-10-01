---
description: Crea una nueva fuente de datos (site) con parser, canales, tests y fixtures
---

Crea una nueva fuente de EPG para: $ARGUMENTS

Carga antes las skills `web-scraping-patterns`, `xmltv-epg` y `jest-testing`.

1. Analiza la web o API de origen y decide entre scraping HTML (cheerio) o API JSON. Usa como
   referencia el site existente mas parecido en `sites/`.
2. Crea la estructura `sites/<dominio>/` con `<dominio>.config.js`, `<dominio>.channels.xml`,
   `<dominio>.test.js`, `__data__/` y `readme.md`, siguiendo las convenciones de AGENTS.md.
3. Guarda en `__data__/` fixtures reales y recortados. Los tests deben mockear axios
   (`jest.mock('axios')`) y no hacer peticiones reales.
4. Convierte las horas de `Europe/Madrid` a UTC con dayjs. Los tests corren con
   `TZ=Pacific/Nauru`, asi que cualquier dependencia de la zona horaria local fallara.
5. Ejecuta `npm test` y `npm run lint` hasta que pasen.
6. Prueba la descarga real con `npm run grab -- --site=<dominio> --days=1`.
7. Pregunta antes de anadir los canales al fichero maestro
   `sites/movistarplus.es/movistarplus.es.channels.xml`, porque eso los incluye en el workflow
   diario.
