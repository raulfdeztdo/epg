import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Tv, List, Info } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/guide', icon: Tv, label: 'Guía' },
  { to: '/channels', icon: List, label: 'Canales' },
  { to: '/about', icon: Info, label: 'Info' }
]

export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-t border-slate-800 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <link.icon size={20} />
            <span className="text-[10px] font-medium">{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
