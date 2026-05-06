import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Tv, Clock, Play, X, ChevronRight } from 'lucide-react'
import { useEpgData } from '../hooks/useEpgData'
import { SOURCE_INFO } from '../data/channelSources'
import { getProgrammesOnNow, type Programme } from '../utils/parseGuide'

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatDateFull(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid'
  })
}

export default function ChannelDetail() {
  const { channelId } = useParams<{ channelId: string }>()
  const navigate = useNavigate()
  const { data, loading, error } = useEpgData()
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null)

  const { channel, programmes, onNow } = useMemo(() => {
    if (!data || !channelId) return { channel: null, programmes: [], onNow: null }

    const ch = data.channels.find(c => c.id === channelId)
    const progs = data.programmesByChannel.get(channelId) || []
    const allOnNow = getProgrammesOnNow(progs)
    const now = allOnNow.length > 0 ? allOnNow[0] : null

    return { channel: ch || null, programmes: progs, onNow: now }
  }, [data, channelId])

  const sourceInfo = channel?.source ? SOURCE_INFO[channel.source] : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Cargando...</p>
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

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center px-4">
          <p className="text-slate-400 text-lg mb-2">Canal no encontrado</p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 mt-0.5"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl lg:text-2xl font-bold text-white">{channel.name}</h1>
            {sourceInfo && (
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  backgroundColor: `${sourceInfo.color}20`,
                  color: sourceInfo.color
                }}
              >
                {sourceInfo.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs lg:text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Tv size={14} />
              ID: <code className="text-slate-500 bg-slate-800/50 px-1 py-0.5 rounded text-[11px]">{channel.id}</code>
            </span>
            <span>
              {programmes.length} programas
            </span>
          </div>
        </div>
      </div>

      {/* Now playing */}
      {onNow && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">
              Ahora en emisión
            </span>
          </div>
          <button
            onClick={() => setSelectedProgramme(onNow)}
            className="w-full text-left"
          >
            <p className="text-base lg:text-lg font-bold text-white">{onNow.title}</p>
            {onNow.subTitle && (
              <p className="text-sm text-red-300/80 mt-0.5">{onNow.subTitle}</p>
            )}
            <p className="text-xs text-red-400/70 mt-2">
              {formatTime(onNow.startDate)} → {formatTime(onNow.stopDate)}
              {onNow.categories.length > 0 && ` · ${onNow.categories.join(', ')}`}
            </p>
          </button>
        </div>
      )}

      {/* Programme list */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          Programación completa
        </h2>

        {programmes.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
            <p className="text-slate-500 text-sm">No hay programas disponibles para este canal</p>
          </div>
        ) : (
          <div className="space-y-1">
            {programmes.map((prog, i) => {
              const isOnAir =
                prog.startDate.getTime() <= Date.now() &&
                prog.stopDate.getTime() >= Date.now()
              const isPast = prog.stopDate.getTime() < Date.now()

              // Show date separator when day changes
              const prevProg = programmes[i - 1]
              const showDate =
                !prevProg ||
                formatDateFull(prog.startDate) !== formatDateFull(prevProg.startDate)

              return (
                <div key={`${prog.channelId}-${prog.start}`}>
                  {showDate && (
                    <div className="flex items-center gap-3 py-3 first:pt-0">
                      <div className="flex-1 h-px bg-slate-800" />
                      <span className="text-xs font-medium text-slate-500 uppercase">
                        {formatDateFull(prog.startDate)}
                      </span>
                      <div className="flex-1 h-px bg-slate-800" />
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedProgramme(prog)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors border ${
                      isOnAir
                        ? 'bg-red-600/10 border-red-600/30 hover:border-red-600/50'
                        : isPast
                          ? 'bg-slate-900/50 border-transparent hover:border-slate-800 opacity-60'
                          : 'bg-slate-900 border-transparent hover:border-slate-800'
                    }`}
                  >
                    {/* Time column */}
                    <div className="shrink-0 w-16 lg:w-20 text-right">
                      <p className={`text-xs lg:text-sm font-mono tabular-nums ${
                        isOnAir ? 'text-red-400' : 'text-slate-400'
                      }`}>
                        {formatTime(prog.startDate)}
                      </p>
                      <p className="text-[10px] lg:text-xs text-slate-600 mt-0.5">
                        {Math.round(
                          (prog.stopDate.getTime() - prog.startDate.getTime()) / 60000
                        )} min
                      </p>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            isOnAir ? 'text-red-300' : 'text-white'
                          }`}>
                            {isOnAir && (
                              <span className="inline-flex items-center gap-1 mr-1.5">
                                <Play size={10} className="text-red-400" />
                              </span>
                            )}
                            {prog.title}
                          </p>
                          {prog.subTitle && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {prog.subTitle}
                            </p>
                          )}
                        </div>
                        <ChevronRight size={14} className="text-slate-600 shrink-0 mt-0.5" />
                      </div>
                      {prog.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {prog.categories.slice(0, 3).map(cat => (
                            <span
                              key={cat}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-slate-500"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Programme detail modal */}
      {selectedProgramme && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedProgramme(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-t-xl lg:rounded-xl w-full lg:max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-4 border-b border-slate-800">
              <div className="min-w-0 flex-1">
                <h3 className="text-base lg:text-lg font-bold text-white">{selectedProgramme.title}</h3>
                {selectedProgramme.subTitle && (
                  <p className="text-sm text-slate-400 mt-0.5">{selectedProgramme.subTitle}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedProgramme(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-2"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Canal: </span>
                  <span className="text-white">{selectedProgramme.channelName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Horario: </span>
                  <span className="text-white">
                    {formatTime(selectedProgramme.startDate)} → {formatTime(selectedProgramme.stopDate)}
                  </span>
                </div>
              </div>

              {selectedProgramme.description && (
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">Sinopsis</p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {selectedProgramme.description}
                  </p>
                </div>
              )}

              {selectedProgramme.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedProgramme.categories.map(cat => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}

              {(selectedProgramme.season || selectedProgramme.episode) && (
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">Episodio</p>
                  <p className="text-sm text-white">
                    {selectedProgramme.season ? `Temporada ${selectedProgramme.season}` : ''}
                    {selectedProgramme.season && selectedProgramme.episode ? ' · ' : ''}
                    {selectedProgramme.episode ? `Episodio ${selectedProgramme.episode}` : ''}
                  </p>
                </div>
              )}

              {[
                { label: 'Director', items: selectedProgramme.directors },
                { label: 'Actores', items: selectedProgramme.actors },
                { label: 'Guionista', items: selectedProgramme.writers },
                { label: 'Productor', items: selectedProgramme.producers },
                { label: 'Presentador', items: selectedProgramme.presenters },
                { label: 'Compositor', items: selectedProgramme.composers }
              ]
                .filter(c => c.items.length > 0)
                .map(credit => (
                  <div key={credit.label}>
                    <p className="text-xs font-medium text-slate-400 mb-1">{credit.label}</p>
                    <p className="text-sm text-slate-300">{credit.items.join(', ')}</p>
                  </div>
                ))}

              {selectedProgramme.icon && (
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-2">Imagen</p>
                  <img
                    src={selectedProgramme.icon}
                    alt={selectedProgramme.title}
                    className="rounded-lg max-h-48 object-cover w-full"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
