const axios = require('axios')
const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
    site: 'movistarplus.es',
    days: 2,
    url({ channel, date }) {
        return `https://www.movistarplus.es/programacion-tv/${channel.site_id}/${date.format(
            'YYYY-MM-DD'
        )}`
    },
    async parser({ content, date }) {
        let programs = []
        const $ = cheerio.load(content)
        const programElements = $('div[id^="ele-"]').get()

        for (let i = 0; i < programElements.length; i++) {
            const programDiv = $(programElements[i])
            const programLink = programDiv.find('a').attr('href')
            
            // Extract title
            const titleElement = programDiv.find('[class*="title"], h1, h2, h3, h4, h5, h6').first()
            const title = titleElement.length ? titleElement.text().trim() : programDiv.find('a').text().trim()
            
            // Extract time
            const timeElement = programDiv.find('.time').first()
            const timeText = timeElement.length ? timeElement.text().trim() : '00:00'
            
            // Crear fechas en timezone local y convertir a UTC manteniendo la fecha correcta
            const startTime = dayjs.tz(`${date.format('YYYY-MM-DD')} ${timeText}`, 'Europe/Madrid')
            let endTime
            
            if (i < programElements.length - 1) {
                const nextTimeText = $(programElements[i + 1]).find('.time').text().trim()
                endTime = dayjs.tz(`${date.format('YYYY-MM-DD')} ${nextTimeText}`, 'Europe/Madrid')
                
                // Si el programa siguiente empieza antes que el actual, es del día siguiente
                if (endTime.isBefore(startTime)) {
                    endTime = endTime.add(1, 'day')
                }
            } else {
                // Para el último programa del día, termina a medianoche del día siguiente
                endTime = dayjs.tz(`${date.format('YYYY-MM-DD')}`, 'Europe/Madrid').add(1, 'day').startOf('day')
            }
            
            // Convertir a UTC pero preservando la fecha local para evitar cambios de día
            // en programas de madrugada
            const startUTC = startTime.utc()
            const endUTC = endTime.utc()
            
            // Get description if available
            let description = null
            if (programLink) {
                const idMatch = programLink.match(/id=(\d+)/)
                if (idMatch && idMatch[1]) {
                    description = await getProgramDescription(programLink).catch(() => null)
                }
            }

            programs.push({
                title: title || 'Programa sin título',
                description: description,
                start: startUTC,
                stop: endUTC
            })
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

// parseItems function removed - now parsing directly from HTML elements

async function getProgramDescription(programUrl) {
    try {
        const response = await axios.get(programUrl, {
            headers: {
                Referer: 'https://www.movistarplus.es/programacion-tv/'
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
