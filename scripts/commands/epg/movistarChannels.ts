import { Channel } from 'epg-grabber'

const MOVISTAR_SITE = 'movistarplus.es'

interface MovistarChannelData {
  site: string
  lang: string
  site_id: string
  xmltv_id: string
  name: string
  index: number
}

const ChannelConstructor = Channel as unknown as new (data: MovistarChannelData) => Channel

export interface DiscoveredChannel {
  site_id?: string
  name?: string
}

/**
 * ID con el que se publica un canal en la guia. Es el mismo criterio que aplica QueueCreator:
 * si el canal no tiene xmltv_id, se usa su site_id.
 */
function guideId(channel: Channel): string {
  return String(channel.xmltv_id || channel.site_id || '')
    .trim()
    .toLowerCase()
}

/**
 * Anade a la lista los canales de Movistar Plus+ descubiertos en la web que no estan en el XML.
 * Los canales del XML no se modifican. Los nuevos se publican con su site_id como ID, igual que
 * los canales de Movistar que ya estan en el fichero maestro, y se descartan si ese ID ya lo usa
 * otro canal de la guia.
 */
export function mergeMovistarChannels(
  existing: Channel[],
  discovered: DiscoveredChannel[]
): Channel[] {
  const merged = [...existing]
  const knownSiteIds = new Set(
    existing
      .filter(channel => channel.site === MOVISTAR_SITE)
      .map(channel =>
        String(channel.site_id || '')
          .trim()
          .toLowerCase()
      )
  )
  const usedGuideIds = new Set(existing.map(guideId))

  for (const item of discovered) {
    const siteId = String(item.site_id || '')
      .trim()
      .toLowerCase()
    const name = String(item.name || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!/^[a-z0-9_-]+$/.test(siteId) || !name) continue
    if (knownSiteIds.has(siteId) || usedGuideIds.has(siteId)) continue

    const channel = new ChannelConstructor({
      site: MOVISTAR_SITE,
      lang: 'es',
      site_id: siteId,
      xmltv_id: siteId,
      name,
      index: merged.length
    })
    Object.assign(channel, { _movistarDiscovered: true })
    merged.push(channel)
    knownSiteIds.add(siteId)
    usedGuideIds.add(siteId)
  }

  return merged
}

/**
 * Ejecuta el descubrimiento si esta activado y hay canales de Movistar en la lista. Si falla,
 * devuelve los canales del XML sin cambios.
 */
export async function discoverMovistarChannels(
  existing: Channel[],
  enabled: boolean,
  discover: () => Promise<DiscoveredChannel[]>,
  onError?: (error: Error) => void
): Promise<Channel[]> {
  if (!enabled || !existing.some(channel => channel.site === MOVISTAR_SITE)) return existing

  try {
    return mergeMovistarChannels(existing, await discover())
  } catch (error) {
    onError?.(error as Error)
    return existing
  }
}
