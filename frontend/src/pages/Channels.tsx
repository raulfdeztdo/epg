import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Tv, Filter, ExternalLink } from 'lucide-react'
import { useEpgData } from '../hooks/useEpgData'
import { SOURCE_INFO, type SourceName } from '../data/channelSources'
import { getProgrammesOnNow } from '../utils/parseGuide'

type TabFilter = 'all' | SourceName

export default function Channels() {
  const { data, loading, error } = useEpgData()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabFilter>('all')

  const { channels, nowProgrammeMap } = useMemo(() => {
    if (!data) return { channels: [], nowProgrammeMap: new Map() }

    const onNow = getProgrammesOnNow(data.programmes)
    const nowMap = new Map<string, string>()
    onNow.forEach(p => nowMap.set(p.channelId, p.title))

    let filtered = data.channels

    if (activeTab !== 'all') {
      filtered = filtered.filter(c => c.source === activeTab)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (nowMap.get(c.id) || '').toLowerCase().includes(q)
      )
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name))

    return { channels: filtered, nowProgrammeMap: nowMap }
  }, [data, activeTab, searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Cargando canales...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center px-4">
          <p className="text-red-400 text-lg font-medium mb-2">Error al cargar datos</p>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-white">Canales</h2>
        <p className="text-slate-400 text-xs lg:text-sm mt-1">
          {data?.stats.totalChannels} canales de 3 fuentes
        </p>
      </div>

      {/* Source tabs */}
      <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 w-fit overflow-x-auto max-w-full no-scrollbar">
        {(['all', ...Object.keys(SOURCE_INFO)] as Array<'all' | SourceName>).map(key => {
          const isActive = activeTab === key
          const color = key === 'all' ? undefined : SOURCE_INFO[key].color
          const label = key === 'all' ? 'Todos' : SOURCE_INFO[key].label
          const count = key === 'all'
            ? data?.stats.totalChannels
            : data?.stats.channelsBySource[key]
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {key !== 'all' && (
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              )}
              {label}
              <span className="text-slate-600 ml-0.5">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-full lg:max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar canal..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 w-12">#</th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Tv size={14} />
                    Canal
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Filter size={14} />
                    Fuente
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">ID</th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Ahora</th>
              </tr>
            </thead>
            <tbody>
              {channels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 text-sm">
                    No se encontraron canales
                  </td>
                </tr>
              ) : (
                channels.map((channel, i) => {
                  const onNow = nowProgrammeMap.get(channel.id)
                  const sourceInfo = channel.source ? SOURCE_INFO[channel.source] : null
                  return (
                    <tr
                      key={channel.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/channel/${channel.id}`)}
                          className="text-sm text-white font-medium hover:text-blue-400 transition-colors flex items-center gap-1"
                        >
                          {channel.name}
                          <ExternalLink size={10} className="text-slate-600" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {sourceInfo && (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: sourceInfo.color }}
                            />
                            <span className="text-xs text-slate-400">{sourceInfo.label}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                          {channel.id}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        {onNow ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
                            <span className="text-xs text-slate-300 truncate max-w-[200px] block">
                              {onNow}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-2">
        {channels.length === 0 ? (
          <p className="text-center py-8 text-slate-500 text-sm">No se encontraron canales</p>
        ) : (
          channels.map(channel => {
            const onNow = nowProgrammeMap.get(channel.id)
            const sourceInfo = channel.source ? SOURCE_INFO[channel.source] : null
            return (
              <button
                key={channel.id}
                onClick={() => navigate(`/channel/${channel.id}`)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors text-left"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <p className="text-sm text-white font-medium">{channel.name}</p>
                  {sourceInfo && (
                    <div
                      className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                      style={{ backgroundColor: sourceInfo.color }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {sourceInfo && (
                    <span className="text-slate-400">{sourceInfo.label}</span>
                  )}
                  <code className="text-slate-600 bg-slate-800/50 px-1 py-0.5 rounded text-[11px]">
                    {channel.id}
                  </code>
                </div>
                {onNow && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
                    <span className="text-xs text-slate-300 truncate">{onNow}</span>
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
