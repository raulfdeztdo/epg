import { useMemo } from 'react'
import { Tv, Clock, Calendar, HardDrive, Radio, BarChart3, Hash } from 'lucide-react'
import { useEpgData } from '../hooks/useEpgData'
import { SOURCE_INFO, type SourceName } from '../data/channelSources'
import { getProgrammesOnNow } from '../utils/parseGuide'
import Footer from '../components/Footer'

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '--'
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid'
  })
}

export default function Dashboard() {
  const { data, loading, error } = useEpgData()

  const onNow = useMemo(() => {
    if (!data) return []
    return getProgrammesOnNow(data.programmes)
  }, [data])

  const topChannels = useMemo(() => {
    if (!data) return []
    const entries = Array.from(data.programmesByChannel.entries())
      .map(([id, progs]) => ({
        id,
        name: data.channels.find(c => c.id === id)?.name || id,
        count: progs.length,
        source: data.channels.find(c => c.id === id)?.source
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    return entries
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Cargando datos EPG...</p>
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

  if (!data) return null

  const { stats } = data

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-400 text-xs lg:text-sm mt-1">
          Datos actualizados el {stats.lastUpdate || '--'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-blue-600/20 rounded-lg">
              <Tv size={16} className="text-blue-400 lg:size-5" />
            </div>
            <div>
              <p className="text-lg lg:text-2xl font-bold text-white">{stats.totalChannels}</p>
              <p className="text-[10px] lg:text-xs text-slate-400">Canales</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-emerald-600/20 rounded-lg">
              <Radio size={16} className="text-emerald-400 lg:size-5" />
            </div>
            <div>
              <p className="text-lg lg:text-2xl font-bold text-white">{stats.totalProgrammes.toLocaleString()}</p>
              <p className="text-[10px] lg:text-xs text-slate-400">Programas</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-violet-600/20 rounded-lg">
              <Calendar size={16} className="text-violet-400 lg:size-5" />
            </div>
            <div>
              <p className="text-lg lg:text-2xl font-bold text-white">{stats.coverageDays} días</p>
              <p className="text-[10px] lg:text-xs text-slate-400">Cobertura</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-amber-600/20 rounded-lg">
              <HardDrive size={16} className="text-amber-400 lg:size-5" />
            </div>
            <div>
              <p className="text-lg lg:text-2xl font-bold text-white">{formatFileSize(stats.fileSize)}</p>
              <p className="text-[10px] lg:text-xs text-slate-400">Tamaño</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coverage info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 lg:p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={14} className="text-slate-400 lg:size-4" />
          <span className="text-xs lg:text-sm font-medium text-white">Ventana de cobertura</span>
        </div>
        <div className="flex items-center gap-2 lg:gap-4 text-xs lg:text-sm text-slate-400">
          <span>{formatDate(stats.coverageStart)}</span>
          <span className="text-slate-600">→</span>
          <span>{formatDate(stats.coverageEnd)}</span>
        </div>
      </div>

      {/* Source breakdown + On Now */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 lg:p-4">
          <div className="flex items-center gap-2 mb-3 lg:mb-4">
            <BarChart3 size={14} className="text-slate-400 lg:size-4" />
            <h3 className="text-xs lg:text-sm font-semibold text-white">Canales por fuente</h3>
          </div>
          <div className="space-y-2 lg:space-y-3">
            {(Object.keys(SOURCE_INFO) as SourceName[]).map(source => {
              const info = SOURCE_INFO[source]
              const count = stats.channelsBySource[source]
              const pct = stats.totalChannels > 0 ? (count / stats.totalChannels) * 100 : 0
              return (
                <div key={source}>
                  <div className="flex items-center justify-between text-xs lg:text-sm mb-1">
                    <div className="flex items-center gap-1.5 lg:gap-2">
                      <div
                        className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full"
                        style={{ backgroundColor: info.color }}
                      />
                      <span className="text-slate-300">{info.label}</span>
                    </div>
                    <span className="text-slate-400 tabular-nums text-xs">{count} canales</span>
                  </div>
                  <div className="w-full h-1.5 lg:h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: info.color
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 lg:p-4">
          <div className="flex items-center gap-2 mb-3 lg:mb-4">
            <Tv size={14} className="text-red-400 lg:size-4" />
            <h3 className="text-xs lg:text-sm font-semibold text-white">
              Ahora en TV ({onNow.length})
            </h3>
          </div>
          {onNow.length === 0 ? (
            <p className="text-slate-500 text-xs lg:text-sm">
              No hay programas en emisión ahora mismo
            </p>
          ) : (
            <div className="space-y-1.5 lg:space-y-2 max-h-60 lg:max-h-80 overflow-y-auto">
              {onNow.slice(0, 15).map(prog => (
                <div
                  key={`${prog.channelId}-${prog.start}`}
                  className="flex items-start gap-2 lg:gap-3 p-1.5 lg:p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 animate-pulse" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs lg:text-sm text-white truncate">{prog.title}</p>
                    <p className="text-[10px] lg:text-xs text-slate-500 truncate">{prog.channelName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top categories + Top channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 lg:p-4">
          <div className="flex items-center gap-2 mb-3 lg:mb-4">
            <BarChart3 size={14} className="text-slate-400 lg:size-4" />
            <h3 className="text-xs lg:text-sm font-semibold text-white">Top categorías</h3>
          </div>
          <div className="space-y-1.5 lg:space-y-2">
            {stats.topCategories.slice(0, 10).map((cat, i) => {
              const maxCount = stats.topCategories[0]?.count || 1
              const pct = (cat.count / maxCount) * 100
              return (
                <div key={cat.name} className="flex items-center gap-2 lg:gap-3">
                  <span className="text-xs text-slate-600 w-4 lg:w-5 text-right tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-slate-300 truncate">{cat.name}</span>
                      <span className="text-slate-500 ml-1 lg:ml-2 tabular-nums text-[11px]">{cat.count}</span>
                    </div>
                    <div className="w-full h-1 lg:h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 lg:p-4">
          <div className="flex items-center gap-2 mb-3 lg:mb-4">
            <Hash size={14} className="text-slate-400 lg:size-4" />
            <h3 className="text-xs lg:text-sm font-semibold text-white">Top canales por programas</h3>
          </div>
          <div className="space-y-1.5 lg:space-y-2">
            {topChannels.map((ch, i) => {
              const maxCount = topChannels[0]?.count || 1
              const pct = (ch.count / maxCount) * 100
              const sourceColor = ch.source ? SOURCE_INFO[ch.source].color : '#64748b'
              return (
                <div key={ch.id} className="flex items-center gap-2 lg:gap-3">
                  <span className="text-xs text-slate-600 w-4 lg:w-5 text-right tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: sourceColor }}
                        />
                        <span className="text-slate-300 truncate">{ch.name}</span>
                      </div>
                      <span className="text-slate-500 ml-1 lg:ml-2 tabular-nums text-[11px]">{ch.count}</span>
                    </div>
                    <div className="w-full h-1 lg:h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: sourceColor
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
