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
M3U_URL=<url> npm run lineup:generate                # Genera lineup.json (grupos/orden de la Guia TV)
```

- Ejecuta siempre `npm test` despues de modificar parsers o tests.
- El test runner usa `cross-env TZ=Pacific/Nauru` para forzar una zona horaria no estandar y detectar bugs de timezone.

## Estructura del proyecto

```
epg/
├── .claude/
│   ├── skills/                 # Skills compartidas (Claude Code + OpenCode)
│   ├── commands/               # Comandos /slash de Claude Code
│   └── settings.json           # Permisos compartidos de Claude Code
├── .opencode/commands/         # Comandos /slash de OpenCode (copia de .claude/commands)
├── .github/workflows/
│   └── update.yml              # GitHub Action (cron diario 03:00 UTC)
├── scripts/
│   ├── commands/
│   │   ├── epg/grab.ts         # Punto de entrada principal
│   │   ├── channels/lint.mts   # Linter XML
│   │   ├── channels/validate.ts
│   │   ├── lineup/generate.ts  # Genera lineup.json a partir de la lista M3U privada
│   │   └── api/load.ts         # Descarga DB de canales (postinstall)
│   ├── core/                   # Motor del grabber (queue, jobs, config loader...)
│   ├── models/                 # Modelos (Channel, Guide, Feed, ChannelList...)
│   ├── types/                  # Tipos TypeScript (.d.ts)
│   └── constants.ts            # Rutas globales (SITES_DIR, DATA_DIR, etc.)
├── sites/
│   ├── movistarplus.es/        # Scraping HTML (cheerio) - 160 canales
│   ├── orangetv.orange.es/     # API JSON (3 segmentos de 8h) - usa @ntlab/sfetch
│   └── programacion-tv.elpais.com/ # API JSON (schedule + program details)
├── frontend/                   # Dashboard React + Vite + Tailwind (package.json propio)
│   ├── src/components/ChannelGrid.tsx # Parrilla agrupada de la Guia TV
│   ├── src/hooks/              # useEpgData, useLineup, useAutoRefresh, useStoredSet
│   ├── vite.config.ts          # Sirve/copia guide.xml y lineup.json desde la raiz
│   └── dist/                   # Build de produccion commiteado (lo publica Netlify)
├── tests/                      # Tests de comandos (Jest)
├── guide.xml                   # Salida generada (XMLTV) - en .gitignore
├── lineup.json                 # Salida generada (grupos y orden de canales) - en .gitignore
├── AGENTS.md                   # Instrucciones para agentes (fuente unica)
├── opencode.json               # Configuracion de OpenCode (permisos)
├── netlify.toml                # Publica frontend/dist sin build
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

- Se ejecuta diariamente a las 03:00 UTC (05:00 Madrid) y se puede lanzar manualmente via
  `workflow_dispatch`.
- Corre en un runner self-hosted (Raspberry Pi "Hepha") con el Node 22 del sistema, por eso no
  usa `actions/setup-node`.
- Pasos: `npm install` -> grab -> `npm run lineup:generate` -> copia `guide.xml` y `lineup.json`
  a `frontend/dist/` -> commit y push.
- El paso del lineup usa el secret `M3U_URL` y tiene `continue-on-error`: si falla, se mantiene
  el `lineup.json` anterior.
- Solo hace `git add -f` de `guide.xml`, `frontend/dist/guide.xml` y `frontend/dist/lineup.json`
  (nunca `git add .`). Netlify despliega `frontend/dist` en cada push.
- Secrets necesarios: `GH_TOKEN` (PAT con permisos de push) y `M3U_URL` (URL de la lista M3U).

## Skills disponibles

El directorio `.claude/skills/` contiene guias especializadas que el agente puede cargar segun la tarea.
Claude Code y OpenCode las descubren automaticamente en esa ruta:

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
  Pesa varios MB: no lo leas entero, usa `grep`/`head` para inspeccionarlo. Lo mismo para
  `frontend/dist/guide.xml`.
- No hagas `npm run build` en `frontend/` ni modifiques `frontend/dist/` salvo que se pida: el
  build commiteado es lo que publica Netlify. Si cambias `frontend/src/`, el cambio no se publica
  hasta que se haga el build y se commitee `frontend/dist/`. Tras el build, comprueba que
  `frontend/dist/guide.xml` no ha retrocedido a una version antigua del `guide.xml` local.

## Guia TV y lista M3U privada

- La vista por defecto de la Guia TV es una parrilla agrupada que sigue los grupos y el orden de
  una lista M3U privada. `scripts/commands/lineup/` la descarga desde la variable de entorno
  `M3U_URL` y escribe `lineup.json` solo con nombres de grupo, IDs de canal de la EPG y logos.
- La URL de la lista y su contenido son privados: no los escribas en ficheros, logs, tests,
  commits ni en el frontend. Nunca anadas a `lineup.json` URLs de stream ni `tvg-name`.
- Si `lineup.json` no existe, la parrilla muestra todos los canales en orden alfabetico.
- Los grupos contraidos se guardan en `localStorage` (`epg.guide.collapsedGroups`). La Guia TV
  refresca `guide.xml` y `lineup.json` cada 5 minutos mientras esta abierta.
- El barrel file `scripts/core/index.ts` reexporta todos los modulos de core. Si se anade o elimina un modulo, actualizar el barrel.
- Lo mismo para `scripts/models/index.ts`.

## Compatibilidad Claude Code / OpenCode

El flujo de trabajo funciona igual con ambas herramientas:

| Pieza | Claude Code | OpenCode |
|-------|-------------|----------|
| Instrucciones | `AGENTS.md` (nativo desde v2.1.277) | `AGENTS.md` |
| Skills | `.claude/skills/` | `.claude/skills/` (ruta compatible) |
| Comandos | `.claude/commands/` | `.opencode/commands/` |
| Permisos | `.claude/settings.json` | `opencode.json` |

Comandos disponibles en ambas herramientas:

| Comando | Uso |
|---------|-----|
| `/verificar [fichero.channels.xml]` | Tests, lint y validacion de canales |
| `/grab-site <site>` | Descarga un dia de un site y revisa la salida |
| `/nuevo-canal <canal>` | Anade un canal al fichero maestro y lo valida |
| `/nuevo-site <dominio>` | Crea una fuente nueva con parser, tests y fixtures |

Reglas de mantenimiento:

- `AGENTS.md` es el unico fichero de instrucciones. No crees `CLAUDE.md` ni `CLAUDE.local.md`:
  si existen, Claude Code los lee en lugar de `AGENTS.md`.
- Las skills van en `.claude/skills/<nombre>/SKILL.md`. El campo `name` del frontmatter debe
  coincidir con el directorio (`^[a-z0-9]+(-[a-z0-9]+)*$`). Los campos extra van bajo
  `metadata`. No las dupliques en `.agents/skills/` ni en `.opencode/skills/`: OpenCode tambien
  lee esas rutas y tendria nombres repetidos.
- `.claude/commands/` y `.opencode/commands/` deben ser identicos. En el frontmatter usa solo
  `description`, que es el campo comun a las dos herramientas. Tras editar un comando:
  `cp .claude/commands/*.md .opencode/commands/`.
- Si cambias los permisos de `.claude/settings.json`, refleja el mismo cambio en `opencode.json`.

## Problemas conocidos

- `npm test` tiene 9 fallos previos en `tests/commands/epg/grab.test.ts`, ajenos a los parsers y
  al lineup. No los tomes como regresion de tus cambios; comprueba que el numero no aumenta.
- `guide.xml` contiene algunos programas duplicados (mismo canal y hora de inicio). En la linea de
  tiempo de la Guia TV generan avisos de claves duplicadas de React en la consola.
