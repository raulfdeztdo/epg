const axios = require('axios')
const cheerio = require('cheerio')
const dayjs = require('dayjs')
const timezone = require('dayjs/plugin/timezone')
const utc = require('dayjs/plugin/utc')

dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'movistarplus.es',
  days: 2,
  url({ channel, date }) {
    return `https://www.movistarplus.es/programacion-tv/${channel.site_id}/${date.format('YYYY-MM-DD')}`
  },
  async parser({ content, channel, date }) {
    try {
      return await parsePrograms(content, date, channel)
    } catch (error) {
      console.error('Error parsing Movistar schedule:', error.message)
      return []
    }
  },
  async channels() {
    const data = await axios.get('https://www.movistarplus.es/programacion-tv/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!data || !data.data) return []
    const $ = cheerio.load(data.data.toString())
    const channels = []
    const seen = new Set()

    $('a[href]').each((i, el) => {
      const href = $(el).attr('href')
      if (!href) return

      // Solo enlaces de movistarplus.es con la forma /programacion-tv/<canal>
      let pathname
      try {
        const parsedUrl = new URL(href, 'https://www.movistarplus.es')
        if (!['www.movistarplus.es', 'movistarplus.es'].includes(parsedUrl.hostname.toLowerCase())) {
          return
        }
        pathname = parsedUrl.pathname
      } catch {
        return
      }

      const match = pathname.match(/^\/programacion-tv\/([^/]+)\/?$/i)
      if (!match) return

      const channelId = decodeURIComponent(match[1]).trim().toLowerCase()
      if (!/^[a-z0-9_-]+$/.test(channelId) || channelId === 'fecha' || seen.has(channelId)) return

      const link = $(el)
      const name = normalizeText(
        link.find('[title]').first().attr('title') ||
          link.find('img[alt]').first().attr('alt') ||
          link.text()
      )
      if (!name) return

      seen.add(channelId)
      channels.push({ site_id: channelId, name })
    })

    return channels
  }
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

async function parsePrograms(content, date, channel) {
    let programs = []
    if (!content) return programs
    const $ = cheerio.load(content.toString())

    // Obtener todos los elementos de programas
    const programElements = $('div[id^="ele-"]')
    
    if (programElements.length === 0) return programs

    // Extraer información básica y URLs de todos los programas
    const programsData = []
    let dayOffset = 0
    let prevHour = -1
    programElements.each((i, element) => {
      const programDiv = $(element)
      
      // Extraer el título directamente del HTML
      const title = normalizeText(programDiv.find('li.title').text()) || 'Sin título'

      // En los canales descubiertos, Movistar rellena los huecos sin emision con bloques cuyo
      // titulo es el nombre del propio canal: no son programas reales
      if (
        channel &&
        channel._movistarDiscovered &&
        title.toLocaleLowerCase('es') === normalizeText(channel.name).toLocaleLowerCase('es')
      ) {
        return
      }
      
      // Extraer la URL del programa para obtener la descripción
      const programUrl = programDiv.find('a').attr('href')
      
      // Extraer la hora de inicio desde el HTML
      const timeElement = programDiv.find('li.time').text().trim()
      
      if (timeElement && timeElement.match(/^\d{2}:\d{2}$/)) {
        const currentHour = parseInt(timeElement.split(':')[0], 10)
        const currentMinute = parseInt(timeElement.split(':')[1], 10)
        // Descartar horas imposibles (p. ej. "25:00" o "10:99")
        if (currentHour > 23 || currentMinute > 59) return

        // Detectar cruce de medianoche: si la hora actual es menor que la anterior
        if (prevHour >= 0 && currentHour < prevHour && prevHour >= 12) {
          dayOffset = 1
        }
        prevHour = currentHour

        // Crear la fecha y hora de inicio en zona horaria de Madrid, luego convertir a UTC
        const startTime = dayjs.tz(date.format('YYYY-MM-DD') + ' ' + timeElement, 'YYYY-MM-DD HH:mm', 'Europe/Madrid').add(dayOffset, 'day').utc()
        
        // Calcular la hora de fin basándose en el siguiente programa
        let endTime = null
        
        if (i < programElements.length - 1) {
          const nextProgramDiv = $(programElements[i + 1])
          const nextTimeElement = nextProgramDiv.find('li.time').text().trim()
          
          if (nextTimeElement && nextTimeElement.match(/^\d{2}:\d{2}$/)) {
            const nextHour = parseInt(nextTimeElement.split(':')[0], 10)
            const nextMinute = parseInt(nextTimeElement.split(':')[1], 10)
            if (nextHour < 24 && nextMinute < 60) {
              const nextDayOffset = (currentHour >= 12 && nextHour < currentHour) ? dayOffset + 1 : dayOffset
              endTime = dayjs.tz(date.format('YYYY-MM-DD') + ' ' + nextTimeElement, 'YYYY-MM-DD HH:mm', 'Europe/Madrid').add(nextDayOffset, 'day').utc()
            }
          }
        }
        
        // Si no hay siguiente programa o no se pudo calcular, usar duración por defecto
        if (!endTime) {
          endTime = startTime.add(2, 'hours')
        }

        programsData.push({
          title: title,
          start: startTime,
          stop: endTime,
          programUrl: programUrl && programUrl.startsWith('http') ? programUrl : (programUrl ? `https://www.movistarplus.es${programUrl}` : null)
        })
      }
    })

    // Obtener descripciones en lotes para optimizar rendimiento
    const descriptions = await getDescriptionsInBatches(programsData.map(p => p.programUrl).filter(Boolean))
    
    // Combinar datos básicos con descripciones
    programsData.forEach((program) => {
      programs.push({
        title: program.title,
        start: program.start,
        stop: program.stop,
        description: descriptions[program.programUrl] || ''
      })
    })

    return programs
}

async function getProgramDescription(programUrl) {
  try {
    const response = await axios.get(programUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.movistarplus.es/programacion-tv/'
      },
      timeout: 10000
    })
    
    const $ = cheerio.load(response.data)
    const description = $('.show-content .text p').text().trim() ||
                      $('meta[property="og:description"]').attr('content') ||
                      $('meta[name="description"]').attr('content') || ''
    
    return description
  } catch (error) {
    console.error(`Error fetching description from ${programUrl}:`, error.message)
    return ''
  }
}

// Función optimizada para obtener descripciones en lotes
async function getDescriptionsInBatches(urls) {
  const descriptions = {}
  const batchSize = 5 // Procesar 5 URLs en paralelo
  const delay = 100 // Pequeño retraso entre lotes para no sobrecargar el servidor
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    
    const promises = batch.map(async (url) => {
      const description = await getProgramDescription(url)
      return { url, description }
    })
    
    const results = await Promise.all(promises)
    
    results.forEach(({ url, description }) => {
      descriptions[url] = description
    })
    
    // Pequeño retraso entre lotes
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return descriptions
}