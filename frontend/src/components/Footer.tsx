import { Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="text-center py-6 px-4 border-t border-slate-800/50 mt-8 mb-16 lg:mb-0">
      <p className="text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
        <span>Creado por{' '}
          <a
            href="https://github.com/raulfdeztdo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors font-medium inline-flex items-center gap-1"
          >
            <Github size={12} />
            raulfdeztdo
          </a>
        </span>
        <span className="hidden sm:inline">&middot;</span>
        <span>Fork de{' '}
          <a
            href="https://github.com/iptv-org/epg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >
            iptv-org/epg
          </a>
        </span>
      </p>
    </footer>
  )
}
