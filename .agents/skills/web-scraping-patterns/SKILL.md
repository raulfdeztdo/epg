---
name: web-scraping-patterns
description: "Patterns for web scraping (cheerio) and consuming JSON APIs in Node.js. Date/timezone handling with dayjs, batched HTTP requests, HTML parsing, and defensive data extraction. Use when creating or modifying EPG site parsers."
---

# Web Scraping & API Consumption Patterns

Guidance for building robust data extraction from HTML pages and JSON APIs, with emphasis on date/timezone handling, error resilience, and rate-limiting.

## When to Use This Skill

- Creating a new EPG site parser (`sites/<domain>/<domain>.config.js`)
- Modifying HTML scraping logic (cheerio selectors)
- Consuming JSON APIs with pagination or segmented endpoints
- Handling timezone conversions (Europe/Madrid <-> UTC)
- Implementing batched/parallel HTTP requests with rate limiting

---

## 1. Site Config Contract

Every parser must export this interface:

```javascript
module.exports = {
  site: 'example.com',          // Domain identifier
  days: 2,                      // Days of EPG to fetch
  request: { cache: { ttl } },  // Optional: HTTP cache config
  url({ channel, date }),       // Returns URL for a given channel+date
  async parser({ content, channel, date }),  // Parses response into programs
  async channels()              // Returns available channels list
}
```

Each program returned by `parser()` must have at minimum:

```javascript
{
  title: 'Program Name',
  start: dayjs,   // dayjs object (UTC)
  stop: dayjs,    // dayjs object (UTC)
  description: '' // Optional but preferred
}
```

Optional fields: `sub_title`, `category`, `season`, `episode`, `icon`, `image`, `director`, `actors`, `writer`, `producer`, `presenter`, `composer`, `guest`.

---

## 2. HTML Scraping with Cheerio

### Loading and Querying

```javascript
const cheerio = require('cheerio')
const $ = cheerio.load(content)

// Select by attribute prefix
const elements = $('div[id^="ele-"]')

// Chain navigation
const title = $(element).find('li.title').text().trim()
const href = $(element).find('a').attr('href')
```

### Defensive Extraction

Always handle missing elements gracefully:

```javascript
// Fallback chain for descriptions
const description =
  $('.show-content .text p').text().trim() ||
  $('meta[property="og:description"]').attr('content') ||
  $('meta[name="description"]').attr('content') ||
  ''

// Guard against missing attributes
const url = programDiv.find('a').attr('href')
const fullUrl = url && url.startsWith('http')
  ? url
  : url ? `https://www.example.com${url}` : null
```

### Common Pitfalls

- **Selectors break silently**: `.find('.nonexistent').text()` returns `''`, not `null`. Always verify selectors against actual HTML fixtures.
- **Whitespace**: Always `.trim()` text extracted from HTML.
- **Relative URLs**: Convert to absolute before making requests.
- **Encoding**: Cheerio defaults to UTF-8. Specify encoding if the source uses another.

---

## 3. JSON API Consumption

### Single Endpoint

```javascript
async parser({ content, channel }) {
  const data = typeof content === 'string' ? JSON.parse(content) : content
  if (!Array.isArray(data)) return []

  const channelData = data.find(i => i.channelId === channel.site_id)
  if (!channelData?.programs) return []

  return channelData.programs.map(item => ({
    title: item.name,
    start: dayjs.utc(item.startDate),
    stop: dayjs.utc(item.endDate)
  }))
}
```

### Multi-Segment APIs

Some APIs split a day into segments (e.g., 3 x 8h segments):

```javascript
async parser({ content, channel, date }) {
  const items = parseItems(content, channel)

  // Fetch remaining segments
  const urls = [
    `${API_ENDPOINT}/${date.format('YYYYMMDD')}_8h_2.json`,
    `${API_ENDPOINT}/${date.format('YYYYMMDD')}_8h_3.json`
  ]

  await doFetch(urls, (url, res) => {
    items.push(...parseItems(res, channel))
  })

  return items.map(item => ({ /* ... */ }))
}
```

### Enrichment Pattern (Secondary Requests)

When the main endpoint provides a schedule but details are in a separate API:

```javascript
async parser({ content, channel }) {
  const items = parseItems(content, channel)
  if (!items.length) return []

  // Load detailed program data
  const details = await axios
    .get(`https://api.example.com/programs/${channel.site_id}.json`)
    .then(r => r.data)
    .catch(() => [])

  return items.map(item => {
    const detail = details.find(d => d.id === item.programId) || {}
    return {
      title: item.title,
      description: detail.description || item.description,
      start: parseStart(item),
      stop: parseStop(item)
    }
  })
}
```

---

## 4. Date & Timezone Handling

### Setup

```javascript
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)
```

### Timezone-Aware Parsing

Spanish EPG data is typically in `Europe/Madrid` (CET/CEST). Always parse with the source timezone, then convert to UTC:

```javascript
// Parse local time and convert to UTC
const start = dayjs.tz('2025-05-30 15:30', 'YYYY-MM-DD HH:mm', 'Europe/Madrid')
// Internally stored as UTC

// Parse already-UTC timestamps
const start = dayjs.utc('2025-01-12T22:55:00.000Z')
```

### Midnight Crossing Detection

When a schedule page only shows `HH:mm` without dates, programs after midnight belong to the next day:

```javascript
let dayOffset = 0
let prevHour = -1

elements.each((i, el) => {
  const timeStr = $(el).find('.time').text().trim()   // e.g. "02:30"
  const currentHour = parseInt(timeStr.split(':')[0], 10)

  // Detect midnight crossing
  if (prevHour >= 0 && currentHour < prevHour && prevHour >= 12) {
    dayOffset = 1
  }
  prevHour = currentHour

  const start = dayjs.tz(
    date.format('YYYY-MM-DD') + ' ' + timeStr,
    'YYYY-MM-DD HH:mm',
    'Europe/Madrid'
  ).add(dayOffset, 'day').utc()
})
```

### Critical Rules

- **Never assume local timezone**: The test runner forces `TZ=Pacific/Nauru` to catch bugs. Always use `dayjs.tz()` or `dayjs.utc()`, never bare `dayjs()`.
- **Store as UTC**: All `start`/`stop` times in the output must be UTC dayjs objects.
- **DST transitions**: `Europe/Madrid` switches between CET (UTC+1) and CEST (UTC+2). `dayjs.tz()` handles this automatically.

---

## 5. Batched HTTP Requests

When fetching many URLs (e.g., individual program pages), use controlled parallelism:

```javascript
async function fetchInBatches(urls, batchSize = 5, delayMs = 100) {
  const results = {}

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)

    const promises = batch.map(async (url) => {
      try {
        const res = await axios.get(url, {
          headers: { 'User-Agent': '...' },
          timeout: 10000
        })
        return { url, data: res.data }
      } catch (error) {
        console.error(`Error fetching ${url}:`, error.message)
        return { url, data: null }
      }
    })

    const batchResults = await Promise.all(promises)
    batchResults.forEach(({ url, data }) => {
      results[url] = data
    })

    // Rate-limit between batches
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return results
}
```

### Key Principles

- **Always set timeouts**: Prevent hanging on unresponsive servers.
- **Set User-Agent**: Many sites block requests without a browser-like UA.
- **Handle individual failures**: One failed request shouldn't abort the whole batch.
- **Rate-limit**: Add delays between batches to avoid getting blocked.

---

## 6. Error Resilience

### Graceful Degradation

```javascript
async parser({ content, date }) {
  // Handle empty or invalid content
  if (!content) return []

  let data
  try {
    data = JSON.parse(content)
  } catch {
    return []
  }

  // Proceed with valid data...
}
```

### Axios Error Handling

```javascript
try {
  const response = await axios.get(url, { timeout: 10000 })
  return response.data
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    console.error(`Timeout fetching ${url}`)
  } else if (error.response) {
    console.error(`HTTP ${error.response.status} from ${url}`)
  } else {
    console.error(`Network error: ${error.message}`)
  }
  return null
}
```

---

## 7. Anti-Patterns

- **Parsing HTML with regex**: Use cheerio. Regex breaks on nested tags, attributes with quotes, etc.
- **Hardcoding timezone offsets**: Use `Europe/Madrid` with dayjs, not `+01:00` or `+02:00` (DST changes).
- **Unbounded parallelism**: `Promise.all(urls.map(fetch))` with 200 URLs will get you rate-limited or banned.
- **Ignoring empty content**: Always check `if (!content) return []` at the top of parsers.
- **Using `dayjs()` without timezone**: Bare `dayjs()` uses the system timezone, which breaks under `TZ=Pacific/Nauru`.
