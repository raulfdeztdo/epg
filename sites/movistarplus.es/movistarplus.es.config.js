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
  async parser({ content, date }) {
    let programs = []
    const $ = cheerio.load(content)
    
    // Obtener todos los elementos de programas
    const programElements = $('div[id^="ele-"]')
    
    if (programElements.length === 0) return programs

    // Extraer información básica y URLs de todos los programas
    const programsData = []
    programElements.each((i, element) => {
      const programDiv = $(element)
      
      // Extraer el título directamente del HTML
      const title = programDiv.find('li.title').text().trim() || 'Sin título'
      
      // Extraer la URL del programa para obtener la descripción
      const programUrl = programDiv.find('a').attr('href')
      
      // Extraer la hora de inicio desde el HTML
      const timeElement = programDiv.find('li.time').text().trim()
      
      if (timeElement && timeElement.match(/^\d{2}:\d{2}$/)) {
        // Crear la fecha y hora de inicio en zona horaria de Madrid, luego convertir a UTC
        // para que el framework EPG la interprete correctamente
        const startTime = dayjs.tz(date.format('YYYY-MM-DD') + ' ' + timeElement, 'YYYY-MM-DD HH:mm', 'Europe/Madrid').utc()
        
        // Calcular la hora de fin basándose en el siguiente programa
        let endTime = null
        
        if (i < programElements.length - 1) {
          const nextProgramDiv = $(programElements[i + 1])
          const nextTimeElement = nextProgramDiv.find('li.time').text().trim()
          
          if (nextTimeElement && nextTimeElement.match(/^\d{2}:\d{2}$/)) {
            endTime = dayjs.tz(date.format('YYYY-MM-DD') + ' ' + nextTimeElement, 'YYYY-MM-DD HH:mm', 'Europe/Madrid').utc()
            
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
  },
  async channels() {
    const axios = require('axios')
    const cheerio = require('cheerio')
    
    const data = await axios.get('https://www.movistarplus.es/programacion-tv/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    const $ = cheerio.load(data.data)
    const channels = []
    
    $('a[href*="/programacion-tv/"]').each((i, el) => {
      const href = $(el).attr('href')
      if (href && href.includes('/programacion-tv/') && !href.includes('/programacion-tv/fecha/')) {
        const match = href.match(/\/programacion-tv\/([^/]+)/)
        if (match) {
          const channelId = match[1]
          const name = $(el).text().trim()
          if (name && channelId !== 'fecha') {
            channels.push({
              site_id: channelId,
              name: name
            })
          }
        }
      }
    })
    
    return channels
  }
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
    const description = $('.sinopsis p').text().trim() || 
                      $('.description').text().trim() || 
                      $('.synopsis').text().trim() || 
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