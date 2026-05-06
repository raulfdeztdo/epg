import { CHANNEL_SOURCE_MAP, type SourceName } from '../data/channelSources'

export interface Programme {
  channelId: string
  channelName: string
  source?: SourceName
  start: string
  stop: string
  startDate: Date
  stopDate: Date
  title: string
  description?: string
  subTitle?: string
  categories: string[]
  season?: number
  episode?: number
  icon?: string
  directors: string[]
  actors: string[]
  writers: string[]
  producers: string[]
  presenters: string[]
  composers: string[]
}

export interface Channel {
  id: string
  name: string
  url?: string
  source?: SourceName
}

export interface EpgStats {
  totalChannels: number
  totalProgrammes: number
  lastUpdate: string
  coverageDays: number
  coverageStart: Date
  coverageEnd: Date
  channelsBySource: Record<SourceName, number>
  topCategories: { name: string; count: number }[]
  programmesByHour: { hour: number; count: number }[]
  fileSize: number
}

export interface ParsedEpgData {
  date: string
  channels: Channel[]
  programmes: Programme[]
  stats: EpgStats
  programmesByChannel: Map<string, Programme[]>
}

export function parseGuideXml(xmlText: string, fileSize?: number): ParsedEpgData {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')

  const tv = doc.querySelector('tv')
  const date = tv?.getAttribute('date') || ''

  // Parse channels
  const channelElements = doc.querySelectorAll('channel')
  const channelMap = new Map<string, Channel>()

  channelElements.forEach(el => {
    const id = el.getAttribute('id') || ''
    const displayName = el.querySelector('display-name')?.textContent || ''
    const url = el.querySelector('url')?.textContent || undefined
    const source = CHANNEL_SOURCE_MAP[id]

    channelMap.set(id, {
      id,
      name: displayName,
      url,
      source
    })
  })

  // Parse programmes
  const programmeElements = doc.querySelectorAll('programme')
  const programmes: Programme[] = []
  const programmesByChannel = new Map<string, Programme[]>()

  programmeElements.forEach(el => {
    const channelId = el.getAttribute('channel') || ''
    const startStr = el.getAttribute('start') || ''
    const stopStr = el.getAttribute('stop') || ''
    const title = el.querySelector('title')?.textContent || ''
    const desc = el.querySelector('desc')?.textContent || undefined
    const subTitle = el.querySelector('sub-title')?.textContent || undefined

    const categories: string[] = []
    el.querySelectorAll('category').forEach(cat => {
      const text = cat.textContent
      if (text) categories.push(text)
    })

    const iconEl = el.querySelector('icon')
    const icon = iconEl?.getAttribute('src') || undefined

    // Episode numbers
    const episodeNums = el.querySelectorAll('episode-num')
    let season: number | undefined
    let episode: number | undefined
    episodeNums.forEach(ep => {
      const system = ep.getAttribute('system')
      if (system === 'xmltv_ns') {
        const parts = (ep.textContent || '').split('.')
        const s = parseInt(parts[0])
        const e = parseInt(parts[1])
        if (!isNaN(s)) season = s
        if (!isNaN(e)) episode = e
      }
    })

    // Credits
    const credits = el.querySelector('credits')
    const getCredits = (role: string): string[] => {
      const result: string[] = []
      if (credits) {
        credits.querySelectorAll(role).forEach(c => {
          if (c.textContent) result.push(c.textContent)
        })
      }
      return result
    }

    const startDate = parseXmltvDate(startStr)
    const stopDate = parseXmltvDate(stopStr)
    const source = CHANNEL_SOURCE_MAP[channelId]

    const programme: Programme = {
      channelId,
      channelName: channelMap.get(channelId)?.name || channelId,
      source,
      start: startDate.toISOString(),
      stop: stopDate.toISOString(),
      startDate,
      stopDate,
      title,
      description: desc,
      subTitle,
      categories,
      season,
      episode,
      icon,
      directors: getCredits('director'),
      actors: getCredits('actor'),
      writers: getCredits('writer'),
      producers: getCredits('producer'),
      presenters: getCredits('presenter'),
      composers: getCredits('composer')
    }

    programmes.push(programme)

    if (!programmesByChannel.has(channelId)) {
      programmesByChannel.set(channelId, [])
    }
    programmesByChannel.get(channelId)!.push(programme)
  })

  // Sort programmes in each channel by start time
  programmesByChannel.forEach(progs => {
    progs.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  })

  // Sort all programmes by start time
  programmes.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  // Compute stats
  const channels = Array.from(channelMap.values())
  const stats = computeStats(programmes, channels, date, fileSize)

  return {
    date,
    channels,
    programmes,
    stats,
    programmesByChannel
  }
}

function parseXmltvDate(dateStr: string): Date {
  // Format: YYYYMMDDHHmmss +0000
  const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
  if (!match) return new Date(dateStr)

  const [, y, m, d, h, min, s] = match
  return new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +s))
}

function computeStats(
  programmes: Programme[],
  channels: Channel[],
  date: string,
  fileSize?: number
): EpgStats {
  // Channels by source
  const channelsBySource: Record<SourceName, number> = {
    'movistarplus.es': 0,
    'programacion-tv.elpais.com': 0,
    'orangetv.orange.es': 0
  }
  channels.forEach(ch => {
    if (ch.source) channelsBySource[ch.source]++
  })

  // Coverage
  let coverageStart = new Date()
  let coverageEnd = new Date(0)
  programmes.forEach(p => {
    if (p.startDate < coverageStart) coverageStart = p.startDate
    if (p.stopDate > coverageEnd) coverageEnd = p.stopDate
  })
  const coverageDays = Math.ceil(
    (coverageEnd.getTime() - coverageStart.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Top categories
  const categoryCount = new Map<string, number>()
  programmes.forEach(p => {
    p.categories.forEach(cat => {
      categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1)
    })
  })
  const topCategories = Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }))

  // Programmes by hour
  const hourCounts = new Array(24).fill(0)
  programmes.forEach(p => {
    const hour = p.startDate.getUTCHours()
    hourCounts[hour]++
  })
  const programmesByHour = hourCounts.map((count, hour) => ({ hour, count }))

  // Last update date from XML date attribute
  const lastUpdate = date
    ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
    : ''

  return {
    totalChannels: channels.length,
    totalProgrammes: programmes.length,
    lastUpdate,
    coverageDays,
    coverageStart,
    coverageEnd,
    channelsBySource,
    topCategories,
    programmesByHour,
    fileSize: fileSize || 0
  }
}

export function getProgrammesOnNow(programmes: Programme[]): Programme[] {
  const now = new Date()
  return programmes.filter(p => p.startDate <= now && p.stopDate >= now)
}
