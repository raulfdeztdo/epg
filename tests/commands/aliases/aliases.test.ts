import { applyAliases, parseAliases } from '../../../scripts/commands/aliases/aliases'

const guide = [
  '<?xml version="1.0" encoding="UTF-8" ?><tv date="20261117">',
  '<channel id="a3"><display-name>Antena 3</display-name><url>https://movistarplus.es</url></channel>',
  '<channel id="BomCine.es"><display-name>Bom Cine</display-name><icon src="https://logo.example/bom.png"/><url>https://orangetv.orange.es</url></channel>',
  '<channel id="c4"><display-name>Cuatro</display-name><url>https://movistarplus.es</url></channel>',
  '<programme start="20261117100000 +0000" stop="20261117110000 +0000" channel="a3"><title lang="es">Noticias</title></programme>',
  '</tv>'
].join('\n')

describe('applyAliases', () => {
  it('adds alternative names after the original one and before icon and url', () => {
    const { xml, added, missingIds } = applyAliases(guide, {
      a3: ['ANTENA 3 FULL HD', 'Antena 3 4K'],
      'BomCine.es': ['Bom Cine HD']
    })

    expect(added).toBe(3)
    expect(missingIds).toEqual([])
    expect(xml).toContain(
      '<channel id="a3"><display-name>Antena 3</display-name>' +
        '<display-name>ANTENA 3 FULL HD</display-name><display-name>Antena 3 4K</display-name>' +
        '<url>https://movistarplus.es</url></channel>'
    )
    expect(xml).toContain(
      '<display-name>Bom Cine</display-name><display-name>Bom Cine HD</display-name>' +
        '<icon src="https://logo.example/bom.png"/>'
    )
    // Los canales sin alias y la programacion no cambian
    expect(xml).toContain(
      '<channel id="c4"><display-name>Cuatro</display-name><url>https://movistarplus.es</url></channel>'
    )
    expect(xml).toContain('channel="a3"><title lang="es">Noticias</title>')
  })

  it('does not duplicate names, ignoring case and extra spaces', () => {
    const first = applyAliases(guide, { a3: ['antena  3', 'Antena 3 HD', 'ANTENA 3 HD'] })
    expect(first.added).toBe(1)

    const second = applyAliases(first.xml, { a3: ['Antena 3 HD'] })
    expect(second.added).toBe(0)
    expect(second.xml).toBe(first.xml)
  })

  it('escapes special characters in the names', () => {
    const { xml } = applyAliases(guide, { c4: ['Cuatro <HD> & "más"'] })
    expect(xml).toContain(
      '<display-name>Cuatro &lt;HD&gt; &amp; &quot;más&quot;</display-name>'
    )
  })

  it('reports aliases for channels that are not in the guide', () => {
    const { xml, added, missingIds } = applyAliases(guide, { noexiste: ['Canal fantasma'] })
    expect(added).toBe(0)
    expect(missingIds).toEqual(['noexiste'])
    expect(xml).toBe(guide)
  })
})

describe('parseAliases', () => {
  it('accepts an object of channel ID to names and trims them', () => {
    expect(parseAliases({ a3: ['  Antena 3   HD '] })).toEqual({ a3: ['Antena 3 HD'] })
    expect(parseAliases({})).toEqual({})
  })

  it('rejects invalid files', () => {
    expect(() => parseAliases([])).toThrow('must be an object')
    expect(() => parseAliases(null)).toThrow('must be an object')
    expect(() => parseAliases({ a3: 'Antena 3 HD' })).toThrow('Invalid names for channel "a3"')
    expect(() => parseAliases({ a3: ['Antena 3 HD', ''] })).toThrow('Invalid names')
    expect(() => parseAliases({ ' ': ['Sin ID'] })).toThrow('empty channel ID')
  })
})
