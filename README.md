# EPG - Guia Electronica de Programacion (TV España)

[![Netlify Status](https://api.netlify.com/api/v1/badges/ca6936cb-f26f-4be2-b332-d9e872601737/deploy-status)](https://app.netlify.com/projects/epg-spain/deploys)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/raulfdeztdo/epg/actions)
[![Node.js](https://img.shields.io/badge/Node.js_22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![XMLTV](https://img.shields.io/badge/XMLTV-format-orange)](https://wiki.xmltv.org/)

Fork simplificado de [iptv-org/epg](https://github.com/iptv-org/epg) para descargar la guia de programacion (EPG) de canales de television en España.

### 🌐 [Dashboard en vivo](https://epg-spain.netlify.app/) · [guide.xml](https://epg-spain.netlify.app/guide.xml)

## Dashboard web

El proyecto incluye un dashboard web completo construido con React, TypeScript y Tailwind CSS:

| Funcionalidad | Descripcion |
| --- | --- |
| **Dashboard** | Metricas clave: canales, programas, cobertura, desglose por fuente, top categorias, densidad horaria |
| **Guia TV** | Timeline interactivo de 48h con scroll, filtro por fuente, busqueda, modal con detalles de cada programa |
| **Canales** | Listado de los 183 canales agrupados por fuente, con busqueda e indicador de emision actual |
| **Info** | Fuentes de datos, horario de actualizacion, reproductores compatibles, enlaces utiles |

El dashboard se despliega automaticamente en Netlify junto con el `guide.xml`.

## Fuentes soportadas

| Fuente | Canales | Metodo |
| --- | --- | --- |
| `movistarplus.es` | 160 | Scraping HTML |
| `programacion-tv.elpais.com` | 17 | API JSON |
| `orangetv.orange.es` | 6 | API JSON |

> Los canales estan definidos en `sites/movistarplus.es/movistarplus.es.channels.xml`. Este fichero incluye canales de las 3 fuentes (cada canal tiene el atributo `site` indicando de donde se obtienen sus datos).

## Como funciona

1. Un **GitHub Action** (`update.yml`) se ejecuta automaticamente cada dia a las 05:00 (hora de Madrid)
2. Lee el fichero de canales y, segun el atributo `site` de cada canal, utiliza el parser correspondiente para obtener la programacion
3. Genera un fichero `guide.xml` en formato XMLTV con la programacion de los proximos 2 dias
4. Copia el `guide.xml` al directorio `frontend/dist/` para que el dashboard lo sirva
5. Hace commit y push automaticamente de los ficheros actualizados
6. Netlify detecta el push y despliega el dashboard + guide.xml

## Estructura del proyecto

```
epg/
├── .agents/skills/             # Skills para agentes IA (web-scraping, xmltv, jest...)
├── .github/workflows/
│   └── update.yml              # Workflow programado (cron diario)
├── frontend/
│   ├── src/
│   │   ├── components/         # Layout, Sidebar, MobileNav, Footer
│   │   ├── data/               # Mapping canales → fuentes
│   │   ├── hooks/              # useEpgData (fetch + parse XMLTV)
│   │   ├── pages/              # Dashboard, Guide, Channels, About
│   │   └── utils/              # Parser XMLTV (DOMParser)
│   ├── dist/                   # Build de produccion (commiteado)
│   ├── package.json
│   └── vite.config.ts          # Vite + React + Tailwind CSS
├── scripts/
│   ├── commands/
│   │   ├── epg/grab.ts         # Comando principal: descarga la EPG
│   │   ├── channels/lint.mts   # Validacion de sintaxis XML
│   │   ├── channels/validate.ts # Validacion de datos de canales
│   │   └── api/load.ts         # Descarga base de datos de canales
│   ├── core/                   # Logica del grabber (queue, jobs, parsers...)
│   ├── models/                 # Modelos de datos (Channel, Guide, Feed...)
│   ├── types/                  # Definiciones de tipos TypeScript
│   └── constants.ts            # Rutas y constantes globales
├── sites/
│   ├── movistarplus.es/        # Parser + canales de Movistar+
│   ├── orangetv.orange.es/     # Parser + canales de Orange TV
│   └── programacion-tv.elpais.com/ # Parser + canales de El Pais
├── tests/                      # Tests (Jest)
├── guide.xml                   # Salida generada (XMLTV) - en .gitignore
├── netlify.toml                # Config de despliegue
├── package.json
└── tsconfig.json
```

### Anatomia de un site

Cada directorio dentro de `sites/` contiene:

```
sites/ejemplo.com/
├── ejemplo.com.config.js       # Configuracion del parser (URL, parser HTML/JSON, timezone)
├── ejemplo.com.channels.xml    # Lista de canales en formato XML
├── ejemplo.com.test.js         # Tests del parser
├── __data__/                   # Fixtures para tests
└── readme.md                   # Documentacion del site
```

## Instalacion

Requisitos: [Node.js](https://nodejs.org/) (v22+) y [Git](https://git-scm.com/).

```sh
git clone https://github.com/raulfdeztdo/epg.git
cd epg
npm install
```

## Uso

### Descargar la guia completa

Ejecuta el grab usando el fichero de canales de Movistar (que incluye canales de las 3 fuentes):

```sh
npm run grab -- --channels=sites/movistarplus.es/movistarplus.es.channels.xml --maxConnections=3 --days=2 --timeout=10000
```

Esto genera el fichero `guide.xml` en el directorio raiz.

### Descargar solo un site concreto

```sh
npm run grab -- --site=orangetv.orange.es
```

### Dashboard (desarrollo)

```sh
cd frontend
npm install
npm run dev
```

El servidor de desarrollo arranca en `http://localhost:5173` y carga `guide.xml` desde la raiz del proyecto.

Para compilar el dashboard para produccion:

```sh
cd frontend
npm run build
```

> El plugin de Vite copia automaticamente `guide.xml` al directorio `dist/` durante el build.

### Opciones del grab

```
Opciones:
  -s, --site <nombre>             Nombre del site a usar
  -c, --channels <ruta>           Ruta al fichero .channels.xml
  -o, --output <ruta>             Fichero de salida (default: "guide.xml")
  -l, --lang <codigos>            Filtrar por idioma (ej: "es,en")
  -t, --timeout <ms>              Timeout por peticion en ms (default: 0)
  -d, --delay <ms>                Retardo entre peticiones en ms (default: 0)
  --days <dias>                   Numero de dias a descargar
  --maxConnections <numero>       Peticiones simultaneas (default: 1)
  --gzip                          Generar version comprimida .xml.gz
```

## GitHub Action

El workflow `.github/workflows/update.yml` se ejecuta:

- **Automaticamente** cada dia a las 03:00 UTC (05:00 hora de Madrid)
- **Manualmente** desde la pestana Actions del repositorio (workflow_dispatch)

Necesita el secret `GH_TOKEN` (Personal Access Token) configurado en el repositorio para poder hacer push.

## Tests

```sh
npm test
```

Ejecuta los tests de los parsers de cada site y los tests de los comandos.

## Lint

```sh
npm run lint
```

## Uso del guide.xml

El fichero `guide.xml` generado esta en formato [XMLTV](https://wiki.xmltv.org/index.php/XMLTVFormat) y es compatible con:

- **Kodi** (PVR IPTV Simple Client)
- **TiviMate**
- **Plex** (con plugin XMLTV)
- **VLC**
- Cualquier reproductor IPTV que soporte guias EPG en formato XMLTV

### URLs disponibles

```
https://epg-spain.netlify.app/guide.xml
https://raw.githubusercontent.com/raulfdeztdo/epg/main/guide.xml
```

## Origen

Fork de [iptv-org/epg](https://github.com/iptv-org/epg), simplificado para mantener unicamente las fuentes de TV en España.

Creado por [raulfdeztdo](https://github.com/raulfdeztdo).

## Licencia

[CC0](LICENSE)
