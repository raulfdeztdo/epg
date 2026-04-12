# EPG - Guia de Programacion TV Espana

Fork simplificado de [iptv-org/epg](https://github.com/iptv-org/epg) para descargar la EPG de canales de TV en Espana.

## Comandos

```bash
npm run grab -- --channels=sites/movistarplus.es/movistarplus.es.channels.xml --maxConnections=3 --days=2 --timeout=10000  # Descarga EPG completa
npm run grab -- --site=orangetv.orange.es           # Descarga solo un site
npm test                                             # Ejecuta tests (Jest + SWC)
npm run lint                                         # ESLint
npm run channels:lint -- <fichero.channels.xml>      # Validar sintaxis XML de canales
npm run channels:validate -- <fichero.channels.xml>  # Validar datos de canales
```

- Ejecuta siempre `npm test` despues de modificar parsers o tests.
- El test runner usa `cross-env TZ=Pacific/Nauru` para forzar una zona horaria no estandar y detectar bugs de timezone.

## Estructura del proyecto

```
epg/
├── .github/workflows/
│   └── update.yml              # GitHub Action (cron diario 03:00 UTC)
├── scripts/
│   ├── commands/
│   │   ├── epg/grab.ts         # Punto de entrada principal
│   │   ├── channels/lint.mts   # Linter XML
│   │   ├── channels/validate.ts
│   │   └── api/load.ts         # Descarga DB de canales (postinstall)
│   ├── core/                   # Motor del grabber (queue, jobs, config loader...)
│   ├── models/                 # Modelos (Channel, Guide, Feed, ChannelList...)
│   ├── types/                  # Tipos TypeScript (.d.ts)
│   └── constants.ts            # Rutas globales (SITES_DIR, DATA_DIR, etc.)
├── sites/
│   ├── movistarplus.es/        # Scraping HTML (cheerio) - 160 canales
│   ├── orangetv.orange.es/     # API JSON (3 segmentos de 8h) - usa @ntlab/sfetch
│   └── programacion-tv.elpais.com/ # API JSON (schedule + program details)
├── tests/                      # Tests de comandos (Jest)
├── guide.xml                   # Salida generada (XMLTV) - en .gitignore
├── package.json
└── tsconfig.json
```

## Fuentes de datos (sites/)

Cada site tiene esta estructura:
```
sites/<dominio>/
├── <dominio>.config.js       # Parser: exports { site, days, url(), parser(), channels() }
├── <dominio>.channels.xml    # Lista de canales XML
├── <dominio>.test.js         # Tests con fixtures en __data__/
├── __data__/                 # HTML/JSON fixtures para tests
└── readme.md
```

### Particularidades importantes

- **movistarplus.es.channels.xml es el fichero maestro**: contiene canales de las 3 fuentes. Cada `<channel>` tiene un atributo `site` que indica de que fuente obtener datos. El workflow solo ejecuta grab contra este fichero.
- **movistarplus.es** hace scraping HTML: extrae programas de `div[id^="ele-"]`, obtiene descripciones haciendo peticiones individuales a cada programa. Detecta cruce de medianoche comparando horas consecutivas.
- **orangetv.orange.es** descarga 3 segmentos JSON de 8 horas cada uno para cubrir las 24h del dia.
- **programacion-tv.elpais.com** hace 2 llamadas: una para la parrilla diaria y otra para detalles de cada programa.

## Convenciones de codigo

- TypeScript strict mode. Modulos CommonJS.
- Sin punto y coma (Prettier: `semi: false`).
- Comillas simples (`singleQuote: true`).
- Ancho maximo 100 caracteres.
- Los configs de sites son `.js` (no TypeScript) porque se cargan dinamicamente en runtime.
- Los tests de sites usan `jest.mock('axios')` para evitar peticiones reales.

## GitHub Action (update.yml)

- Se ejecuta diariamente a las 03:00 UTC (05:00 Madrid).
- Se puede lanzar manualmente via `workflow_dispatch`.
- Solo hace `git add guide.xml` (no `git add .`).
- Requiere el secret `GH_TOKEN` (PAT con permisos de push).
- Usa Node.js 22.

## Skills disponibles

El directorio `.agents/skills/` contiene guias especializadas que el agente puede cargar segun la tarea:

| Skill | Uso |
|-------|-----|
| `web-scraping-patterns` | Crear/modificar parsers de sites: cheerio, APIs JSON, dayjs/timezones, peticiones HTTP en lotes |
| `xmltv-epg` | Formato XMLTV, estructura de `channels.xml`, pipeline del grabber, anadir canales/fuentes |
| `jest-testing` | Tests de parsers: fixtures, mocking de axios, aserciones de fechas, depuracion de timezone |
| `nodejs-best-practices` | Decisiones de arquitectura Node.js, patrones async, manejo de errores |
| `typescript-advanced-types` | Tipos avanzados de TypeScript: generics, conditional types, utility types |

Carga la skill correspondiente cuando trabajes en:
- **Parsers de sites** -> `web-scraping-patterns` + `xmltv-epg`
- **Tests** -> `jest-testing`
- **Codigo TypeScript en scripts/** -> `typescript-advanced-types` + `nodejs-best-practices`

## Notas para el agente

- No modificar los ficheros en `scripts/core/` ni `scripts/models/` salvo que sea estrictamente necesario. Son del upstream de iptv-org/epg y conviene mantener compatibilidad.
- Al crear o modificar parsers de sites, siempre actualizar los tests y fixtures correspondientes.
- Los ficheros `.channels.xml` usan encoding UTF-8 y formato XML con indentacion de 4 espacios.
- `guide.xml` esta en `.gitignore`. El GitHub Action lo genera y commitea explicitamente.
- El barrel file `scripts/core/index.ts` reexporta todos los modulos de core. Si se anade o elimina un modulo, actualizar el barrel.
- Lo mismo para `scripts/models/index.ts`.
