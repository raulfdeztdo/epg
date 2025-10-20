const axios = require('axios')
const cheerio = require('cheerio')
const dayjs = require('dayjs')

module.exports = {
  site: 'movistarplus.es',
  days: 2,
  url({ channel, date }) {
    return `https://www.movistarplus.es/programacion-tv/${channel.site_id}/${date.format('YYYY-MM-DD')}`
  },
  async parser({ content, date }) {
    let programs = []
    let items = parseItems(content)
    if (!items.length) return programs

    const $ = cheerio.load(content)
    const programElements = $('div[id^="ele-"]').get()

    for (let i = 0; i < programElements.length; i++) {
      const programDiv = $(programElements[i])
      let description = null
      let title = null

      // Extraer el título desde el HTML
      title = programDiv.find('li.title').text().trim()

      // Extraer la hora de inicio desde el HTML
      const timeElement = programDiv.find('li.time').text().trim()
      let startTime = null
      let endTime = null

      if (timeElement && timeElement.match(/^\d{2}:\d{2}$/)) {
        const [hours, minutes] = timeElement.split(':')
        
        // Crear la fecha y hora de inicio
        startTime = dayjs(date).hour(parseInt(hours)).minute(parseInt(minutes)).second(0)
        
        // Calcular la hora de fin basándose en el siguiente programa
        if (i < programElements.length - 1) {
          const nextProgramDiv = $(programElements[i + 1])
          const nextTimeElement = nextProgramDiv.find('li.time').text().trim()
          
          if (nextTimeElement && nextTimeElement.match(/^\d{2}:\d{2}$/)) {
            const [nextHours, nextMinutes] = nextTimeElement.split(':')
            endTime = dayjs(date).hour(parseInt(nextHours)).minute(parseInt(nextMinutes)).second(0)
            
            // Si el siguiente programa es al día siguiente (hora menor)
            if (endTime.isBefore(startTime)) {
              endTime = endTime.add(1, 'day')
            }
          }
        }
        
        // Si no hay siguiente programa o no se pudo calcular, usar duración por defecto
        if (!endTime) {
          endTime = startTime.add(2, 'hours') // Duración por defecto de 2 horas
        }
      }

      // Obtener descripción si hay enlace
      const programLink = programDiv.find('a').attr('href')
      if (programLink) {
        const idMatch = programLink.match(/id=(\d+)/)
        if (idMatch && idMatch[1]) {
          description = await getProgramDescription(programLink).catch(() => null)
        }
      }

      // Solo añadir el programa si tenemos hora de inicio válida
      if (startTime && endTime) {
        programs.push({
          title: title || 'Sin título',
          description: description,
          start: startTime,
          stop: endTime
        })
      }
    }

    return programs
  },
  async channels() {
    const html = await axios
      .get('https://www.movistarplus.es/programacion-tv')
      .then(r => r.data)
      .catch(console.log)

    const $ = cheerio.load(html)
    let scheme = $('script:contains(ItemList)').html()
    scheme = JSON.parse(scheme)

    return scheme.itemListElement.map(el => {
      const urlParts = el.item.url.split('/')
      const site_id = urlParts.pop().toLowerCase()

      return {
        lang: 'es',
        name: el.item.name,
        site_id
      }
    })
  }
}

function parseItems(content) {
  try {
    const $ = cheerio.load(content)
    let scheme = $('script:contains("@type": "ItemList")').html()
    scheme = JSON.parse(scheme)
    if (!scheme || !Array.isArray(scheme.itemListElement)) return []

    return scheme.itemListElement
  } catch {
    return []
  }
}

async function getProgramDescription(programUrl) {
  try {
    const response = await axios.get(programUrl, {
      headers: {
        'Referer': 'https://www.movistarplus.es/programacion-tv/'
      }
    })

    const $ = cheerio.load(response.data)
    const description = $('.show-content .text p').first().text().trim() || null

    return description
  } catch (error) {
    console.error(`Error fetching description from ${programUrl}:`, error.message)
    return null
  }
}