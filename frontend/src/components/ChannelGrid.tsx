import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import type { Channel, Programme } from '../utils/parseGuide'
import type { Lineup } from '../hooks/useLineup'
import { useStoredSet } from '../hooks/useStoredSet'

const COLLAPSED_GROUPS_KEY = 'epg.guide.collapsedGroups'
const FALLBACK_GROUP = 'Todos los canales'

interface ChannelGridProps {
  channels: Channel[]
  lineup: Lineup | null
  programmesByChannel: Map<string, Programme[]>
  now: number
  searching: boolean
  onSelectProgramme: (programme: Programme) => void
}

interface GridGroup {
  name: string
  channels: Channel[]
}

function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}.${String(date.getMinutes()).padStart(2, '0')}h`
}

function findCurrent(programmes: Programme[] | undefined, now: number) {
  if (!programmes) return { current: undefined, next: undefined }
  const index = programmes.findIndex(
    p => p.startDate.getTime() <= now && p.stopDate.getTime() > now
  )
  if (index === -1) {
    return { current: undefined, next: programmes.find(p => p.startDate.getTime() > now) }
  }
  return { current: programmes[index], next: programmes[index + 1] }
}

function episodeLine(programme: Programme): string | undefined {
  if (programme.subTitle) {
    return programme.episode
      ? `Ep. ${programme.episode} "${programme.subTitle}"`
      : `"${programme.subTitle}"`
  }
  if (programme.episode) return `Episodio ${programme.episode}`
  return undefined
}

function ChannelLogo({ channel, logo }: { channel: Channel; logo?: string }) {
  const [failed, setFailed] = useState(false)

  return (
    <div className="w-full aspect-[3/2] rounded-lg bg-slate-800/80 border border-slate-700/40 flex items-center justify-center overflow-hidden group-hover:border-slate-500 transition-colors">
      {logo && !failed ? (
        <img
          src={logo}
          alt={channel.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="max-w-[70%] max-h-[60%] object-contain"
        />
      ) : (
        <span className="px-2 text-sm font-bold text-slate-200 text-center line-clamp-2">
          {channel.name}
        </span>
      )}
    </div>
  )
}

function ChannelCard({
  channel,
  logo,
  programmes,
  now,
  onSelectProgramme
}: {
  channel: Channel
  logo?: string
  programmes?: Programme[]
  now: number
  onSelectProgramme: (programme: Programme) => void
}) {
  const navigate = useNavigate()
  const { current, next } = findCurrent(programmes, now)

  const progress = current
    ? Math.min(
        100,
        Math.max(
          0,
          ((now - current.startDate.getTime()) /
            (current.stopDate.getTime() - current.startDate.getTime())) *
            100
        )
      )
    : 0
  const episode = current && episodeLine(current)
  const tooltip = [channel.name, next && `Después: ${next.title} (${formatClock(next.startDate)})`]
    .filter(Boolean)
    .join('\n')

  return (
    <button
      onClick={() => (current ? onSelectProgramme(current) : navigate(`/channel/${channel.id}`))}
      title={tooltip}
      className="group flex flex-col items-center text-center min-w-0"
    >
      <ChannelLogo channel={channel} logo={logo} />

      <div className="w-[80%] h-1 rounded-full bg-slate-700/70 mt-2.5 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
      </div>

      {current ? (
        <div className="mt-2 w-full space-y-0.5">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 truncate">
            {channel.name}
          </p>
          <p className="text-xs font-semibold text-white leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
            {current.title}
            {current.season ? ` (T${current.season})` : ''}
          </p>
          {episode && <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{episode}</p>}
          <p className="text-[11px] text-slate-300 tabular-nums">
            {formatClock(current.startDate)} - {formatClock(current.stopDate)}
          </p>
        </div>
      ) : (
        <div className="mt-2 w-full space-y-0.5">
          <p className="text-xs font-semibold text-slate-500 truncate">{channel.name}</p>
          <p className="text-[11px] text-slate-600">Sin información</p>
        </div>
      )}
    </button>
  )
}

export default function ChannelGrid({
  channels,
  lineup,
  programmesByChannel,
  now,
  searching,
  onSelectProgramme
}: ChannelGridProps) {
  const [collapsed, toggleGroup] = useStoredSet(COLLAPSED_GROUPS_KEY)

  const groups = useMemo<GridGroup[]>(() => {
    if (!lineup) {
      const sorted = [...channels].sort((a, b) => a.name.localeCompare(b.name))
      return sorted.length ? [{ name: FALLBACK_GROUP, channels: sorted }] : []
    }

    const byId = new Map(channels.map(c => [c.id, c]))
    return lineup.groups
      .map(group => ({
        name: group.name,
        channels: group.channels.flatMap(id => byId.get(id) ?? [])
      }))
      .filter(group => group.channels.length > 0)
  }, [channels, lineup])

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <p className="text-sm text-slate-500">No hay canales que coincidan con el filtro.</p>
      </div>
    )
  }

  return (
    <div className="pb-8">
      {groups.map(group => {
        // While searching every group is shown expanded so matches are never hidden
        const isCollapsed = !searching && collapsed.has(group.name)
        return (
          <section key={group.name}>
            <button
              onClick={() => toggleGroup(group.name)}
              aria-expanded={!isCollapsed}
              className="sticky top-0 z-10 w-full flex items-center gap-2 px-4 lg:px-6 py-2.5 bg-slate-950/95 backdrop-blur border-b border-slate-800 text-left hover:bg-slate-900/95 transition-colors"
            >
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
              />
              <h2 className="text-sm font-semibold text-white tracking-wide">{group.name}</h2>
              <span className="text-xs text-slate-500 tabular-nums">{group.channels.length}</span>
            </button>

            {!isCollapsed && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-x-4 lg:gap-x-6 gap-y-6 px-4 lg:px-6 py-5">
                {group.channels.map(channel => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    logo={lineup?.logos[channel.id]}
                    programmes={programmesByChannel.get(channel.id)}
                    now={now}
                    onSelectProgramme={onSelectProgramme}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
