---
name: jest-testing
description: "Jest testing patterns for EPG site parsers. Covers fixture-based testing, axios mocking, dayjs date handling in tests, and timezone-safe assertions. Use when writing or modifying tests for site parsers."
---

# Jest Testing Patterns for EPG Parsers

Testing conventions and patterns specific to this project, which uses Jest with SWC for fast transpilation and tests EPG site parsers against HTML/JSON fixtures.

## When to Use This Skill

- Writing tests for a new site parser
- Modifying existing parser tests
- Debugging test failures related to timezones or date formatting
- Setting up axios mocks for parsers that make secondary HTTP requests

---

## 1. Test Setup

### Configuration

The project uses Jest with SWC (via `@swc/jest`) for TypeScript transpilation. Tests run with a forced timezone to catch timezone-related bugs:

```bash
# In package.json scripts:
"test": "cross-env TZ=Pacific/Nauru npx jest --verbose"
```

This means any test that uses `new Date()`, `dayjs()` without `.utc()`, or other timezone-dependent operations will produce unexpected results -- which is the point. Parsers must use `dayjs.utc()` or `dayjs.tz()` to be correct.

### File Structure

```
sites/<domain>/
├── <domain>.config.js      # Parser under test
├── <domain>.test.js         # Test file
└── __data__/
    ├── content.html         # Main page fixture (HTML scraping)
    ├── content.json         # Main page fixture (JSON API)
    ├── program1.html        # Detail page fixture
    ├── data1.json           # Segment fixture
    └── programs.json        # Programs detail fixture
```

---

## 2. Test File Template

```javascript
const { parser, url } = require('./<domain>.config.js')
const fs = require('fs')
const path = require('path')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)
dayjs.extend(utc)
const axios = require('axios')
jest.mock('axios')

const date = dayjs.utc('2025-05-30', 'YYYY-MM-DD').startOf('d')
const channel = {
  site_id: 'channel_id',
  xmltv_id: 'Channel.es'
}

it('can generate valid url', () => {
  expect(url({ channel, date })).toBe(
    'https://example.com/schedule/channel_id/2025-05-30'
  )
})

it('can parse response', async () => {
  const content = fs.readFileSync(path.resolve(__dirname, '__data__/content.html'))

  // Mock secondary requests if needed
  axios.get.mockImplementation(url => {
    return Promise.resolve({ data: '' })
  })

  let results = await parser({ content, date })
  results = results.map(p => {
    p.start = p.start.toJSON()
    p.stop = p.stop.toJSON()
    return p
  })

  expect(results.length).toBe(/* expected count */)
  expect(results[0]).toMatchObject({
    start: '2025-05-30T03:15:00.000Z',
    stop: '2025-05-30T04:25:00.000Z',
    title: 'Program Name',
    description: 'Program description.'
  })
})

it('can handle empty guide', async () => {
  const results = await parser({
    date,
    channel,
    content: ''  // or '[]' or '{}'
  })
  expect(results).toMatchObject([])
})
```

---

## 3. Axios Mocking

### Basic Mock

```javascript
const axios = require('axios')
jest.mock('axios')
```

`jest.mock('axios')` replaces the entire axios module with auto-mocked functions. This prevents real HTTP requests during tests.

### URL-Based Response Routing

When a parser makes secondary requests (e.g., fetching program details), mock different responses based on URL:

```javascript
axios.get.mockImplementation(url => {
  if (url === 'https://example.com/program/123') {
    return Promise.resolve({
      data: fs.readFileSync(path.resolve(__dirname, '__data__/program1.html'))
    })
  } else if (url === 'https://example.com/program/456') {
    return Promise.resolve({
      data: fs.readFileSync(path.resolve(__dirname, '__data__/program2.html'))
    })
  }
  // Default: return empty response
  return Promise.resolve({ data: '' })
})
```

### Mocking for JSON APIs

Some parsers call axios for enrichment data (e.g., programacion-tv.elpais.com fetches program details):

```javascript
axios.get.mockImplementation(url => {
  if (url === 'https://api.example.com/programs/3.json') {
    return Promise.resolve({
      data: JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '__data__/programs.json'))
      )
    })
  }
  return Promise.resolve({ data: '' })
})
```

### Multi-Segment Mocking

For APIs that split data into segments (e.g., orangetv splits 24h into 3 x 8h):

```javascript
axios.get.mockImplementation(url => {
  const urls = {
    'https://api.example.com/20250112_8h_1.json': 'data1.json',
    'https://api.example.com/20250112_8h_2.json': 'data2.json',
    'https://api.example.com/20250112_8h_3.json': 'data3.json'
  }

  const result = {}
  if (urls[url]) {
    result.data = fs.readFileSync(
      path.join(__dirname, '__data__', urls[url])
    ).toString()

    // Some segments may need to be parsed as JSON
    if (!urls[url].startsWith('data1')) {
      result.data = JSON.parse(result.data)
    }
  }

  return Promise.resolve(result)
})
```

---

## 4. Date Assertions

### Converting dayjs to JSON

Parser results contain dayjs objects for `start` and `stop`. Convert to ISO strings for assertions:

```javascript
let results = await parser({ content, date })
results = results.map(p => {
  p.start = p.start.toJSON()
  p.stop = p.stop.toJSON()
  return p
})
```

### Why `.toJSON()` and Not `.format()`

`.toJSON()` produces a consistent ISO 8601 string (`2025-05-30T03:15:00.000Z`) regardless of the system timezone. This works correctly even under `TZ=Pacific/Nauru`.

### Creating Test Dates

Always create dates with `.utc()` to avoid timezone dependency:

```javascript
// Correct
const date = dayjs.utc('2025-05-30', 'YYYY-MM-DD').startOf('d')

// Wrong - depends on system timezone
const date = dayjs('2025-05-30')
```

---

## 5. Fixture Management

### HTML Fixtures

Capture real HTML from the source website and save to `__data__/content.html`. Keep fixtures minimal but representative:

- Include enough programs to test first, last, and edge cases
- Include programs that cross midnight (for midnight detection tests)
- Trim unnecessary HTML (headers, footers, scripts) to reduce fixture size

### JSON Fixtures

For JSON APIs, save the actual API response to `__data__/content.json`. If the API returns large payloads, trim to a representative subset but keep the structure intact.

### Updating Fixtures

When a site changes its HTML structure or API format:

1. Capture new response from the real site
2. Save to `__data__/`
3. Update the test expectations to match
4. Run `npm test` to verify

---

## 6. Test Coverage Patterns

### Three Mandatory Tests

Every parser should have at least these tests:

1. **URL generation**: Verify `url()` produces the correct URL
   ```javascript
   it('can generate valid url', () => {
     expect(url({ channel, date })).toBe('https://...')
   })
   ```

2. **Parsing**: Verify `parser()` extracts programs correctly
   ```javascript
   it('can parse response', async () => {
     // Load fixture, mock axios, call parser, check results
   })
   ```

3. **Empty input**: Verify `parser()` handles empty/invalid content
   ```javascript
   it('can handle empty guide', async () => {
     const results = await parser({ content: '', channel, date })
     expect(results).toMatchObject([])
   })
   ```

### Additional Tests to Consider

- **Midnight crossing**: Programs after midnight get the correct date
- **Missing descriptions**: Parser returns `''` instead of `null`/`undefined`
- **Special characters**: Channel names or titles with accents, tildes
- **Season/episode parsing**: Correct integer extraction

---

## 7. Debugging Test Failures

### Timezone Issues

If tests pass locally but fail in CI (or vice versa), it's likely a timezone bug. The forced `TZ=Pacific/Nauru` (UTC+12) is intentionally extreme.

**Symptom**: Times are off by several hours.
**Fix**: Use `dayjs.tz()` with explicit timezone in the parser, not bare `dayjs()`.

### Fixture Staleness

If a test suddenly fails with unexpected content, the source website may have changed.

**Fix**: Capture fresh fixtures and update test expectations.

### Mock Not Working

If the parser makes real HTTP requests during tests:

**Check**: Is `jest.mock('axios')` at the top of the test file?
**Check**: Does the parser use `require('axios')` at the module level? (If it's required inside a function, the mock may not apply.)

---

## 8. Running Tests

```bash
# Run all tests
npm test

# Run a specific site's test
npx jest sites/movistarplus.es/

# Run with debug output
npx jest --verbose sites/orangetv.orange.es/

# Run in watch mode during development
npx jest --watch
```
