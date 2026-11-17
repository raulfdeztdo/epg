/** Nombres alternativos por ID de canal de la guia: { "a3": ["Antena 3 HD", "ANTENA 3 FHD"] } */
export type ChannelAliases = Record<string, string[]>

export interface ApplyAliasesResult {
  xml: string
  /** Numero de <display-name> anadidos */
  added: number
  /** IDs del fichero de alias que no estan en la guia */
  missingIds: string[]
}

const CHANNEL_REGEX = /<channel\s+id="([^"]*)"\s*>([\s\S]*?)<\/channel>/g
const DISPLAY_NAME_REGEX = /<display-name(?:\s[^>]*)?>([\s\S]*?)<\/display-name>/g

/** Valida el contenido del fichero de alias y devuelve los nombres sin espacios sobrantes. */
export function parseAliases(data: unknown): ChannelAliases {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The aliases file must be an object of channel ID to a list of names')
  }

  const aliases: ChannelAliases = {}
  for (const [channelId, names] of Object.entries(data)) {
    if (!channelId.trim()) throw new Error('The aliases file contains an empty channel ID')
    if (!Array.isArray(names) || names.some(name => typeof name !== 'string' || !name.trim())) {
      throw new Error(`Invalid names for channel "${channelId}": expected a list of non-empty texts`)
    }
    aliases[channelId] = names.map(normalizeName)
  }

  return aliases
}

/**
 * Anade a cada canal de la guia sus nombres alternativos como <display-name> extra, detras de los
 * que ya tiene: el primero sigue siendo el nombre original y todos quedan antes de <icon> y <url>,
 * como exige la DTD de XMLTV. No duplica nombres, asi que se puede aplicar varias veces.
 */
export function applyAliases(xml: string, aliases: ChannelAliases): ApplyAliasesResult {
  const foundIds = new Set<string>()
  let added = 0

  const result = xml.replace(CHANNEL_REGEX, (element: string, rawId: string, body: string) => {
    const channelId = unescapeXml(rawId)
    const names = aliases[channelId]
    if (!names) return element
    foundIds.add(channelId)

    const existing = new Set(
      [...body.matchAll(DISPLAY_NAME_REGEX)].map(match => nameKey(unescapeXml(match[1])))
    )
    const newNames: string[] = []
    for (const name of names) {
      const key = nameKey(name)
      if (existing.has(key)) continue
      existing.add(key)
      newNames.push(name)
    }
    if (!newNames.length) return element

    added += newNames.length
    const tags = newNames.map(name => `<display-name>${escapeXml(name)}</display-name>`).join('')
    const lastDisplayName = body.lastIndexOf('</display-name>')
    const insertAt = lastDisplayName === -1 ? 0 : lastDisplayName + '</display-name>'.length
    const newBody = body.slice(0, insertAt) + tags + body.slice(insertAt)

    return element.replace(body, () => newBody)
  })

  const missingIds = Object.keys(aliases).filter(channelId => !foundIds.has(channelId))

  return { xml: result, added, missingIds }
}

function normalizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim()
}

function nameKey(name: string): string {
  return normalizeName(name).toLocaleLowerCase('es')
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
}
