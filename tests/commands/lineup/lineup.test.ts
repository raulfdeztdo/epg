import {
  buildLineup,
  cleanGroupName,
  parseGuideChannelIds,
  parseM3u
} from '../../../scripts/commands/lineup/lineup'

const M3U = `#EXTM3U x-tvg-url="https://example.com/guide.xml"
#EXTINF:-1 tvg-id="AMC.es" tvg-logo="https://logos.example/amc.png" tvg-name="ES| AMC FHD" group-title="[ES] ENTRETENIMIENTO",ES| AMC FHD
https://stream.example/amc-fhd
#EXTINF:-1 tvg-id="AMC.es" tvg-logo="https://logos.example/amc-hd.png" tvg-name="ES| AMC HD" group-title="[ES] ENTRETENIMIENTO",ES| AMC HD
https://stream.example/amc-hd
#EXTINF:-1 tvg-logo="https://logos.example/orbe.png" tvg-name="ES| ORBE" group-title="[ES] ENTRETENIMIENTO",ES| ORBE
https://stream.example/orbe
#EXTINF:-1 tvg-id="a3" tvg-logo="http://logos.example/a3.png" group-title="[ES] GENERAL",Antena 3
https://stream.example/a3
#EXTINF:-1 tvg-id="unknown" group-title="[ES] GENERAL",Unknown
https://stream.example/unknown
#EXTINF:-1 tvg-id="dazn1" group-title="EU | SPAIN DAZN",DAZN 1
https://stream.example/dazn1
#EXTINF:-1 tvg-id="a3",Antena 3 backup
#EXTGRP:[ES] DEPORTES
https://stream.example/a3-backup
`

const GUIDE = `<?xml version="1.0" encoding="UTF-8" ?><tv>
<channel id="a3"><display-name>Antena 3</display-name></channel>
<channel id="AMC.es"><display-name>AMC</display-name></channel>
<channel id="dazn1"><display-name>DAZN 1</display-name></channel>
<channel id="R&amp;B"><display-name>R&amp;B</display-name></channel>
</tv>`

describe('lineup', () => {
  it('parses M3U entries without keeping stream urls or names', () => {
    const entries = parseM3u(M3U)

    expect(entries).toHaveLength(6)
    expect(entries[0]).toEqual({
      tvgId: 'AMC.es',
      logo: 'https://logos.example/amc.png',
      group: '[ES] ENTRETENIMIENTO'
    })
    expect(entries[5]).toEqual({ tvgId: 'a3', logo: undefined, group: '[ES] DEPORTES' })
    expect(JSON.stringify(entries)).not.toContain('stream.example')
  })

  it('cleans group prefixes', () => {
    expect(cleanGroupName('[ES] ENTRETENIMIENTO')).toBe('ENTRETENIMIENTO')
    expect(cleanGroupName('EU | SPAIN DAZN')).toBe('DAZN')
    expect(cleanGroupName('EU | SPAIN M+ SPORT')).toBe('M+ SPORT')
    expect(cleanGroupName('Favoritos')).toBe('Favoritos')
  })

  it('reads channel ids from the guide', () => {
    expect(parseGuideChannelIds(GUIDE)).toEqual(new Set(['a3', 'AMC.es', 'dazn1', 'R&B']))
  })

  it('keeps only guide channels, in M3U order and grouped', () => {
    const lineup = buildLineup(
      parseM3u(M3U),
      parseGuideChannelIds(GUIDE),
      new Date('2026-10-01T00:00:00Z')
    )

    expect(lineup).toEqual({
      generatedAt: '2026-10-01T00:00:00.000Z',
      groups: [
        { name: 'ENTRETENIMIENTO', channels: ['AMC.es'] },
        { name: 'GENERAL', channels: ['a3'] },
        { name: 'DAZN', channels: ['dazn1'] },
        { name: 'DEPORTES', channels: ['a3'] }
      ],
      logos: { 'AMC.es': 'https://logos.example/amc.png' }
    })
  })
})
