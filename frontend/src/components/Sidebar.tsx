import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Tv, List, Info, Github } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/guide', icon: Tv, label: 'Guía TV' },
  { to: '/channels', icon: List, label: 'Canales' },
  { to: '/about', icon: Info, label: 'Info' }
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-full">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">📺</span>
          <div>
            <h1 className="text-sm font-bold text-white">EPG Spain</h1>
            <p className="text-xs text-slate-400">Guía TV España</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <link.icon size={18} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 space-y-3 border-t border-slate-800">
        <a
          href="/guide.xml"
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-400 border border-slate-700 rounded-lg hover:border-slate-600 hover:text-white transition-colors"
          download
        >
          ⬇ guide.xml
        </a>
        <p className="text-center text-[10px] text-slate-600 flex items-center justify-center gap-1">
          by{' '}
          <a
            href="https://github.com/raulfdeztdo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-400 transition-colors inline-flex items-center gap-0.5"
          >
            <Github size={10} />
            raulfdeztdo
          </a>
        </p>
      </div>
    </aside>
  )
}
