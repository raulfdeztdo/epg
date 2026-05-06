import { Github, Rss, Clock, Server, Monitor, Tv, Code } from 'lucide-react'
import Footer from '../components/Footer'

const PLAYERS = [
  {
    name: 'TiviMate',
    url: 'https://play.google.com/store/apps/details?id=ar.tvplayer.tv',
    desc: 'Reproductor IPTV para Android TV con soporte XMLTV'
  },
  {
    name: 'Kodi',
    url: 'https://kodi.tv/',
    desc: 'Centro multimedia con addon IPTV Simple Client'
  },
  {
    name: 'Plex',
    url: 'https://www.plex.tv/',
    desc: 'Servidor multimedia con soporte EPG'
  },
  {
    name: 'VLC',
    url: 'https://www.videolan.org/vlc/',
    desc: 'Reproductor universal compatible con M3U + EPG'
  }
]

export default function About() {
  return (
    <div className="p-4 lg:p-6 space-y-5 lg:space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-white">Acerca de EPG Spain</h2>
        <p className="text-slate-400 text-xs lg:text-sm mt-1">
          Guía de Programación TV para España — datos XMLTV de código abierto
        </p>
      </div>

      {/* What is this */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg shrink-0">
            <Tv size={18} className="text-blue-400 lg:size-5" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-semibold text-white mb-2">¿Qué es esto?</h3>
            <p className="text-xs lg:text-sm text-slate-300 leading-relaxed">
              EPG Spain genera diariamente un archivo XMLTV con la programación de 183 canales de
              televisión españoles. Los datos se obtienen de 3 fuentes: la web de Movistar Plus+,
              la programación de El País, y la API de Orange TV.
            </p>
            <p className="text-xs lg:text-sm text-slate-300 leading-relaxed mt-2">
              El archivo <code className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">guide.xml</code> es
              compatible con cualquier reproductor IPTV que soporte el formato XMLTV: TiviMate, Kodi,
              Plex, VLC, y muchos más.
            </p>
          </div>
        </div>
      </div>

      {/* Data sources */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-600/20 rounded-lg shrink-0">
            <Server size={18} className="text-emerald-400 lg:size-5" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-semibold text-white mb-3">Fuentes de datos</h3>
            <div className="space-y-3">
              <div className="border-l-2 border-blue-500 pl-3">
                <p className="text-xs lg:text-sm font-medium text-white">Movistar Plus+</p>
                <p className="text-[11px] lg:text-xs text-slate-400 mt-0.5">
                  160 canales. Scraping HTML de la web oficial. Incluye todos los canales de la
                  plataforma: generalistas, deportes, cine, series, infantiles, internacionales.
                </p>
              </div>
              <div className="border-l-2 border-emerald-500 pl-3">
                <p className="text-xs lg:text-sm font-medium text-white">El País</p>
                <p className="text-[11px] lg:text-xs text-slate-400 mt-0.5">
                  17 canales. API JSON de programacion-tv.elpais.com. Canales temáticos como
                  Hollywood, Canal Cocina, Historia, Odisea, Dark, XTRM, etc.
                </p>
              </div>
              <div className="border-l-2 border-orange-500 pl-3">
                <p className="text-xs lg:text-sm font-medium text-white">Orange TV</p>
                <p className="text-[11px] lg:text-xs text-slate-400 mt-0.5">
                  6 canales. API JSON de orangetv.orange.es. Canales regionales andaluces y
                  temáticos adicionales.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update schedule */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-violet-600/20 rounded-lg shrink-0">
            <Clock size={18} className="text-violet-400 lg:size-5" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-semibold text-white mb-2">Actualización</h3>
            <p className="text-xs lg:text-sm text-slate-300 leading-relaxed">
              Los datos se actualizan automáticamente cada día a las <strong>05:00</strong> (hora
              de Madrid, 03:00 UTC) mediante GitHub Actions. La guía cubre 2 días de programación.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="px-2 py-0.5 text-[11px] lg:text-xs rounded-full bg-slate-800 text-slate-300">
                Diario · 05:00 CET
              </span>
              <span className="px-2 py-0.5 text-[11px] lg:text-xs rounded-full bg-slate-800 text-slate-300">
                2 días de cobertura
              </span>
              <span className="px-2 py-0.5 text-[11px] lg:text-xs rounded-full bg-slate-800 text-slate-300">
                183 canales
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* How to use */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-600/20 rounded-lg shrink-0">
            <Monitor size={18} className="text-amber-400 lg:size-5" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-semibold text-white mb-3">
              Cómo usar la guía
            </h3>
            <p className="text-xs lg:text-sm text-slate-300 mb-3">
              Añade esta URL como fuente EPG en tu reproductor IPTV:
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <code className="text-[11px] lg:text-xs text-blue-400 break-all">
                https://epg-spain.netlify.app/guide.xml
              </code>
            </div>
            <p className="text-[11px] lg:text-xs text-slate-500 mt-2">
              También puedes usar la URL raw de GitHub:{' '}
              <code className="text-slate-400 break-all">
                https://raw.githubusercontent.com/raulfdeztdo/epg/main/guide.xml
              </code>
            </p>
          </div>
        </div>
      </div>

      {/* Compatible players */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-rose-600/20 rounded-lg shrink-0">
            <Tv size={18} className="text-rose-400 lg:size-5" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-semibold text-white">Reproductores compatibles</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3">
          {PLAYERS.map(player => (
            <a
              key={player.name}
              href={player.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors"
            >
              <p className="text-xs lg:text-sm font-medium text-white">{player.name}</p>
              <p className="text-[11px] lg:text-xs text-slate-400 mt-1">{player.desc}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-600/20 rounded-lg shrink-0">
            <Code size={18} className="text-slate-400 lg:size-5" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-semibold text-white mb-3">Enlaces</h3>
            <div className="space-y-2">
              <a
                href="https://github.com/raulfdeztdo/epg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs lg:text-sm text-slate-400 hover:text-white transition-colors"
              >
                <Github size={14} className="lg:size-4" />
                Código fuente en GitHub
              </a>
              <a
                href="/guide.xml"
                className="flex items-center gap-2 text-xs lg:text-sm text-slate-400 hover:text-white transition-colors"
              >
                <Rss size={14} className="lg:size-4" />
                Archivo guide.xml
              </a>
              <a
                href="https://github.com/iptv-org/epg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs lg:text-sm text-slate-400 hover:text-white transition-colors"
              >
                <Github size={14} className="lg:size-4" />
                Proyecto original (iptv-org/epg)
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
