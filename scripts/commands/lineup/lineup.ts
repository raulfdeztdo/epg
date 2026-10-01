export interface M3uEntry {
  tvgId: string
  logo?: string
  group: string
}

export interface LineupGroup {
  name: string
  channels: string[]
}

export interface Lineup {
  generatedAt: string
  groups: LineupGroup[]
  logos: Record<string, string>
}

const ATTRIBUTE_REGEX = /([\w-]+)="([^"]*)"/g

export function parseM3u(content: string): M3uEntry[] {
  const entries: M3uEntry[] = []
  const lines = content.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line.startsWith('#EXTINF')) continue

    const attributes: Record<string, string> = {}
    for (const [, key, value] of line.matchAll(ATTRIBUTE_REGEX)) {
      attributes[key] = value.trim()
    }

    let group = attributes['group-title']
    const next = lines[i + 1]?.trim()
    if (!group && next?.startsWith('#EXTGRP:')) group = next.slice('#EXTGRP:'.length).trim()

    const tvgId = attributes['tvg-id']
    if (!tvgId || !group) continue

    entries.push({ tvgId, logo: attributes['tvg-logo'] || undefined, group })
  }

  return entries
}

// "[ES] ENTRETENIMIENTO" -> "ENTRETENIMIENTO", "EU | SPAIN DAZN" -> "DAZN"
export function cleanGroupName(name: string): string {
  const cleaned = name
    .replace(/^\[[A-Z]{2,3}\]\s*/, '')
    .replace(/^[A-Z]{2,3}\s*\|\s*/, '')
    .replace(/^SPAIN\s+/, '')
    .trim()

  return cleaned || name.trim()
}

export function parseGuideChannelIds(xml: string): Set<string> {
  const ids = new Set<string>()
  for (const [, id] of xml.matchAll(/<channel\s+id="([^"]+)"/g)) {
    ids.add(decodeXmlEntities(id))
  }
  return ids
}

export function buildLineup(
  entries: M3uEntry[],
  epgChannelIds: Set<string>,
  now = new Date()
): Lineup {
  const groups = new Map<string, string[]>()
  const logos: Record<string, string> = {}

  for (const entry of entries) {
    if (!epgChannelIds.has(entry.tvgId)) continue

    const name = cleanGroupName(entry.group)
    const channels = groups.get(name) ?? []
    if (!channels.includes(entry.tvgId)) channels.push(entry.tvgId)
    groups.set(name, channels)

    if (!logos[entry.tvgId] && entry.logo?.startsWith('https://')) logos[entry.tvgId] = entry.logo
  }

  return {
    generatedAt: now.toISOString(),
    groups: Array.from(groups, ([name, channels]) => ({ name, channels })),
    logos
  }
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}
