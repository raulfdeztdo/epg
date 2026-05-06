import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, ChevronRight, Play, ExternalLink } from 'lucide-react'
import { useEpgData } from '../hooks/useEpgData'
import { SOURCE_INFO, type SourceName } from '../data/channelSources'
import { getProgrammesOnNow } from '../utils/parseGuide'
import type { Programme } from '../utils/parseGuide'

const PX_PER_HOUR = 160
const HOUR_HEIGHT = 44

function formatHour(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:00`
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function Guide() {
  const { data, loading, error } = useEpgData()
  const navigate = useNavigate()
  const [sourceFilter, setSourceFilter] = useState<SourceName | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null)
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const channelListRef = useRef<HTMLDivElement>(null)

  const { filteredChannels, filteredProgrammes, programmesByChannel, timelineStart, timelineEnd } =
    useMemo(() => {
      if (!data) {
        return {
          filteredChannels: [],
          filteredProgrammes: [],
          programmesByChannel: new Map<string, Programme[]>(),
          timelineStart: new Date(),
          timelineEnd: new Date()
        }
      }

      let programmes = data.programmes
      let channels = data.channels

      if (sourceFilter !== 'all') {
        programmes = programmes.filter(p => p.source === sourceFilter)
        channels = channels.filter(c => c.source === sourceFilter)
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        programmes = programmes.filter(
          p =>
            p.title.toLowerCase().includes(q) ||
            p.channelName.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        )
        const matchingChannelIds = new Set(programmes.map(p => p.channelId))
        channels = channels.filter(c => matchingChannelIds.has(c.id))
      }

      const byChannel = new Map<string, Programme[]>()
      programmes.forEach(p => {
        if (!byChannel.has(p.channelId)) byChannel.set(p.channelId, [])
        byChannel.get(p.channelId)!.push(p)
      })

      byChannel.forEach(progs => progs.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()))

      channels.sort((a, b) => a.name.localeCompare(b.name))

      let tStart = new Date()
      let tEnd = new Date(0)
      programmes.forEach(p => {
        if (p.startDate < tStart) tStart = p.startDate
        if (p.stopDate > tEnd) tEnd = p.stopDate
      })

      return {
        filteredChannels: channels,
        filteredProgrammes: programmes,
        programmesByChannel: byChannel,
        timelineStart: tStart,
        timelineEnd: tEnd
      }
    }, [data, sourceFilter, searchQuery])

  const totalWidth = useMemo(() => {
    return (timelineEnd.getTime() - timelineStart.getTime()) * (PX_PER_HOUR / (1000 * 60 * 60))
  }, [timelineStart, timelineEnd])

  const nowPosition = useMemo(() => {
    const now = Date.now()
    return (now - timelineStart.getTime()) * (PX_PER_HOUR / (1000 * 60 * 60))
  }, [timelineStart])

  const onNowProgrammes = useMemo(() => {
    return getProgrammesOnNow(filteredProgrammes)
  }, [filteredProgrammes])

  useEffect(() => {
    if (data && scrollContainerRef.current && nowPosition > 0) {
      const containerWidth = scrollContainerRef.current.clientWidth
      scrollContainerRef.current.scrollLeft = nowPosition - containerWidth / 4
    }
  }, [data, nowPosition])

  const handleMainScroll = useCallback(() => {
    if (scrollContainerRef.current && channelListRef.current) {
      channelListRef.current.scrollTop = scrollContainerRef.current.scrollTop
    }
  }, [])

  const handleChannelScroll = useCallback(() => {
    if (channelListRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = channelListRef.current.scrollTop
    }
  }, [])

  const hourMarkers = useMemo(() => {
    const markers: { hour: Date; left: number }[] = []
    const start = new Date(timelineStart)
    start.setMinutes(0, 0, 0)
    start.setHours(start.getHours() + 1)
    const end = new Date(timelineEnd)
    for (let t = new Date(start); t <= end; t.setHours(t.getHours() + 1)) {
      const left = (t.getTime() - timelineStart.getTime()) * (PX_PER_HOUR / (1000 * 60 * 60))
      markers.push({ hour: new Date(t), left })
    }
    return markers
  }, [timelineStart, timelineEnd])

  const isNow = (prog: Programme): boolean => {
    const now = Date.now()
    return prog.startDate.getTime() <= now && prog.stopDate.getTime() >= now
  }

  const isPast = (prog: Programme): boolean => {
    return prog.stopDate.getTime() < Date.now()
  }

  const scrollToNow = () => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth
      scrollContainerRef.current.scrollTo({
        left: nowPosition - containerWidth / 4,
        behavior: 'smooth'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Cargando guía TV...</p>
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
    <div className="flex flex-col h-full">
      {/* Filters bar */}
      <div className="flex items-center gap-2 lg:gap-4 px-3 lg:px-4 py-2 lg:py-3 border-b border-slate-800 bg-slate-950 shrink-0 overflow-x-auto no-scrollbar">
        {/* Source filter */}
        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 shrink-0">
          {(['all', ...Object.keys(SOURCE_INFO)] as Array<'all' | SourceName>).map(key => {
            const isActive = sourceFilter === key
            const label = key === 'all' ? 'Todas' : SOURCE_INFO[key].label
            return (
              <button
                key={key}
                onClick={() => setSourceFilter(key)}
                className={`px-2 lg:px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-[180px] lg:max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Now button - desktop only */}
        <button
          onClick={scrollToNow}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors shrink-0"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          Ahora
        </button>

        <span className="text-xs text-slate-500 ml-auto shrink-0 hidden sm:block">
          {filteredProgrammes.length.toLocaleString()} prog &middot; {filteredChannels.length} canales
        </span>
      </div>

      {/* === DESKTOP: Timeline grid === */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        <div
          ref={channelListRef}
          onScroll={handleChannelScroll}
          className="w-48 shrink-0 overflow-y-auto overflow-x-hidden bg-slate-950 border-r border-slate-800 no-scrollbar"
          style={{ scrollbarWidth: 'none' }}
        >
          <div style={{ height: HOUR_HEIGHT }} className="border-b border-slate-800" />
          {filteredChannels.map(channel => (
            <div
              key={channel.id}
              className="flex items-center h-12 px-3 border-b border-slate-800/50 hover:bg-slate-900/50"
            >
              <button
                onClick={() => navigate(`/channel/${channel.id}`)}
                className="text-xs text-white truncate font-medium hover:text-blue-400 transition-colors text-left w-full flex items-center gap-1.5"
              >
                {channel.name}
                <ExternalLink size={10} className="text-slate-600 shrink-0" />
              </button>
            </div>
          ))}
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto"
          onScroll={handleMainScroll}
        >
          <div className="relative" style={{ width: totalWidth + 200, minWidth: '100%' }}>
            <div
              className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800"
              style={{ height: HOUR_HEIGHT }}
            >
              {hourMarkers.map(marker => (
                <div
                  key={marker.hour.toISOString()}
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: marker.left }}
                >
                  <div className="w-px h-3 bg-slate-600" />
                  <span className="text-[10px] text-slate-500 mt-1 tabular-nums">
                    {formatHour(marker.hour)}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-none"
              style={{ left: nowPosition }}
            >
              <div className="absolute top-0 w-px h-full bg-red-500 animate-pulse-line" />
              <div className="absolute top-0 -translate-x-1/2 px-1.5 py-0.5 rounded bg-red-500 text-[10px] font-bold text-white whitespace-nowrap">
                {formatTime(new Date())}
              </div>
            </div>

            {filteredChannels.map(channel => {
              const channelProgs = programmesByChannel.get(channel.id) || []
              return (
                <div key={channel.id} className="relative h-12 border-b border-slate-800/50">
                  {channelProgs.map(prog => {
                    const left =
                      (prog.startDate.getTime() - timelineStart.getTime()) *
                      (PX_PER_HOUR / (1000 * 60 * 60))
                    const width = Math.max(
                      (prog.stopDate.getTime() - prog.startDate.getTime()) *
                        (PX_PER_HOUR / (1000 * 60 * 60)),
                      4
                    )
                    const isOnAir = isNow(prog)
                    return (
                      <button
                        key={`${prog.channelId}-${prog.start}`}
                        onClick={() => setSelectedProgramme(prog)}
                        className={`absolute top-0.5 bottom-0.5 rounded-md px-2 flex items-center overflow-hidden text-left transition-opacity hover:opacity-90 animate-fade-in ${
                          isOnAir
                            ? 'bg-red-600/20 border border-red-600/40'
                            : 'bg-slate-800/80 border border-slate-700/50 hover:border-slate-600'
                        }`}
                        style={{ left: Math.max(0, left), width: Math.min(width, totalWidth - left + 200) }}
                      >
                        <span className={`text-xs truncate font-medium ${isOnAir ? 'text-red-300' : 'text-slate-300'}`}>
                          {prog.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* === MOBILE: Vertical channel list === */}
      <div className="lg:hidden flex-1 overflow-y-auto">
        {/* On now section */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-white">Ahora en TV</h3>
            <span className="text-xs text-slate-500">{onNowProgrammes.length} en emisión</span>
          </div>
          <div className="space-y-1">
            {onNowProgrammes.slice(0, 6).map(prog => (
              <button
                key={`now-${prog.channelId}-${prog.start}`}
                onClick={() => setSelectedProgramme(prog)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors text-left"
              >
                <Play size={14} className="text-red-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white truncate font-medium">{prog.title}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {prog.channelName} · {formatTime(prog.startDate)} → {formatTime(prog.stopDate)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* All channels */}
        <div className="px-4 py-2">
          <h3 className="text-sm font-semibold text-white mb-3">Todos los canales</h3>
          <div className="space-y-2">
            {filteredChannels.map(channel => {
              const channelProgs = programmesByChannel.get(channel.id) || []
              const isExpanded = expandedChannel === channel.id
              const visibleProgs = isExpanded ? channelProgs : channelProgs.slice(0, 3)

              return (
                <div
                  key={channel.id}
                  className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
                >
                  {/* Channel header */}
                  <div className="flex items-center border-b border-slate-800/50">
                    <button
                      onClick={() => navigate(`/channel/${channel.id}`)}
                      className="flex-1 flex items-center min-w-0 p-3 hover:bg-slate-800/30 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-white font-medium truncate hover:text-blue-400 transition-colors">
                          {channel.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {channelProgs.length} programas
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setExpandedChannel(isExpanded ? null : channel.id)}
                      className="p-3 hover:bg-slate-800/30 transition-colors shrink-0"
                    >
                      <ChevronRight
                        size={14}
                        className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>
                  </div>

                  {/* Programmes */}
                  <div className="border-t border-slate-800">
                    {visibleProgs.map(prog => {
                      const isOnAir = isNow(prog)
                      const isOld = isPast(prog)
                      return (
                        <button
                          key={`${prog.channelId}-${prog.start}`}
                          onClick={() => setSelectedProgramme(prog)}
                          className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-800/30 transition-colors text-left border-b border-slate-800/50 last:border-b-0 ${
                            isOnAir ? 'bg-red-600/10' : isOld ? 'opacity-50' : ''
                          }`}
                        >
                          {isOnAir ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs truncate ${isOnAir ? 'text-red-300 font-medium' : 'text-slate-300'}`}>
                              {prog.title}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {formatTime(prog.startDate)} → {formatTime(prog.stopDate)}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Show more */}
                  {channelProgs.length > 3 && !isExpanded && (
                    <button
                      onClick={() => setExpandedChannel(channel.id)}
                      className="w-full p-2 text-[11px] text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition-colors"
                    >
                      Ver {channelProgs.length - 3} más...
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
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
