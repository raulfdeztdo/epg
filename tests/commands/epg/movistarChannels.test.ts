import {
  discoverMovistarChannels,
  mergeMovistarChannels
} from '../../../scripts/commands/epg/movistarChannels'
import { parseChannels } from 'epg-grabber'

describe('mergeMovistarChannels', () => {
  const existing = parseChannels(`
    <channels>
      <channel site="movistarplus.es" lang="es" xmltv_id="" site_id="a3">Antena 3</channel>
      <channel site="movistarplus.es" lang="es" xmltv_id="BasketballChannel.es" site_id="mbalct" logo="https://logo.example/hoops.png">M+ Baloncesto</channel>
      <channel site="orangetv.orange.es" lang="es" xmltv_id="La1.es" site_id="1010">La 1</channel>
      <channel site="programacion-tv.elpais.com" lang="es" xmltv_id="" site_id="656">Cazavision</channel>
    </channels>
  `)

  it('keeps the file channels and publishes new ones with their site_id as ID', () => {
    const merged = mergeMovistarChannels(existing, [
      { site_id: 'MBALCT', name: 'Nombre alternativo' },
      { site_id: 'DAZBA', name: ' DAZN   Baloncesto ' },
      { site_id: 'dazba', name: 'DAZN Baloncesto duplicado' },
      { site_id: '../bad', name: 'Invalido' },
      { site_id: 'vam2sd', name: '' }
    ])

    expect(merged).toHaveLength(existing.length + 1)
    existing.forEach((channel, i) => expect(merged[i]).toBe(channel))
    expect(merged[1]).toMatchObject({
      xmltv_id: 'BasketballChannel.es',
      icon: 'https://logo.example/hoops.png',
      name: 'M+ Baloncesto'
    })
    expect(merged[existing.length]).toMatchObject({
      site: 'movistarplus.es',
      lang: 'es',
      site_id: 'dazba',
      xmltv_id: 'dazba',
      name: 'DAZN Baloncesto',
      _movistarDiscovered: true
    })
  })

  it('skips discovered channels whose ID is already used by another source', () => {
    const merged = mergeMovistarChannels(existing, [
      { site_id: '656', name: 'Otro canal' },
      { site_id: 'la1.es', name: 'Otra La 1' }
    ])

    expect(merged).toEqual(existing)
  })

  it('keeps all file channels when discovery is empty', () => {
    expect(mergeMovistarChannels(existing, [])).toEqual(existing)
  })
})

describe('discoverMovistarChannels', () => {
  const existing = parseChannels(`
    <channels>
      <channel site="movistarplus.es" lang="es" xmltv_id="" site_id="a3">Antena 3</channel>
    </channels>
  `)

  it('falls back to the file channels when discovery fails', async () => {
    const onError = jest.fn()
    const result = await discoverMovistarChannels(
      existing,
      true,
      async () => {
        throw new Error('network unavailable')
      },
      onError
    )

    expect(result).toEqual(existing)
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'network unavailable' }))
  })

  it('does not call discovery when it is disabled', async () => {
    const discover = jest.fn()
    await expect(discoverMovistarChannels(existing, false, discover)).resolves.toBe(existing)
    expect(discover).not.toHaveBeenCalled()
  })

  it('does not call discovery when there are no Movistar channels', async () => {
    const discover = jest.fn()
    const others = parseChannels(`
      <channels>
        <channel site="orangetv.orange.es" lang="es" xmltv_id="La1.es" site_id="1010">La 1</channel>
      </channels>
    `)
    await expect(discoverMovistarChannels(others, true, discover)).resolves.toBe(others)
    expect(discover).not.toHaveBeenCalled()
  })
})
