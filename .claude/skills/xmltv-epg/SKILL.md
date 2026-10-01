---
name: xmltv-epg
description: "XMLTV format and EPG (Electronic Program Guide) conventions. Channel XML structure, program fields, multi-source channel files, and the iptv-org/epg grabber architecture. Use when editing channels.xml, understanding the grabber pipeline, or debugging EPG output."
---

# XMLTV & EPG Conventions

Reference for the XMLTV format, channel file structure, and the EPG grabber pipeline used in this project (forked from iptv-org/epg).

## When to Use This Skill

- Editing or creating `*.channels.xml` files
- Understanding the XMLTV output format (`guide.xml`)
- Adding or removing channels from the master channel file
- Debugging the grabber pipeline
- Understanding how multi-source channel files work

---

## 1. Channel File Format (`.channels.xml`)

Channel files define which channels to grab EPG data for. They are XML files with UTF-8 encoding and 4-space indentation.

### Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<channels>
    <channel site="movistarplus.es" lang="es" xmltv_id="" site_id="a3">Antena 3</channel>
    <channel site="orangetv.orange.es" lang="es" xmltv_id="" site_id="1010">La 1</channel>
</channels>
```

### Attributes

| Attribute  | Required | Description |
|-----------|----------|-------------|
| `site`    | Yes      | Domain of the parser to use (must match a `sites/<domain>/` directory) |
| `lang`    | Yes      | Language code (ISO 639-1), typically `es` for Spanish channels |
| `xmltv_id`| Yes      | XMLTV identifier. Can be empty `""` if not mapped to the iptv-org database |
| `site_id` | Yes      | Channel identifier used by the source site's API/website |

The text content of `<channel>` is the human-readable channel name.

### Master Channel File

In this project, `movistarplus.es.channels.xml` is the **master file**. It contains channels from all 3 sources, each with its own `site` attribute:

```xml
<!-- Movistar source (160 channels) -->
<channel site="movistarplus.es" lang="es" xmltv_id="" site_id="a3">Antena 3</channel>

<!-- Orange source (6 channels) -->
<channel site="orangetv.orange.es" lang="es" xmltv_id="" site_id="1010">La 1</channel>

<!-- El Pais source (17 channels) -->
<channel site="programacion-tv.elpais.com" lang="es" xmltv_id="" site_id="3">La 1</channel>
```

The grabber reads the `site` attribute to determine which parser config to load for each channel. This means a single `--channels` file can aggregate channels from multiple sources.

### Validation

```bash
# Check XML syntax
npm run channels:lint -- sites/movistarplus.es/movistarplus.es.channels.xml

# Validate channel data
npm run channels:validate -- sites/movistarplus.es/movistarplus.es.channels.xml
```

---

## 2. XMLTV Output Format (`guide.xml`)

The grabber produces an XMLTV file with this structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="iptv-org/epg" generator-info-url="https://iptv-org.github.io">
  <channel id="Antena3.es">
    <display-name>Antena 3</display-name>
  </channel>

  <programme start="20250530051500 +0000" stop="20250530062500 +0000" channel="Antena3.es">
    <title lang="es">Noticias</title>
    <desc lang="es">Informativo diario.</desc>
    <category lang="es">Noticias</category>
    <episode-num system="xmltv_ns">0.22.</episode-num>
    <icon src="https://example.com/image.jpg"/>
  </programme>
</tv>
```

### Date Format

XMLTV uses the format `YYYYMMDDHHmmss +0000` for all timestamps. The grabber handles conversion from dayjs objects automatically.

### Program Fields Mapping

| Parser field  | XMLTV element | Notes |
|--------------|---------------|-------|
| `title`      | `<title>`     | Required |
| `description`| `<desc>`      | |
| `sub_title`  | `<sub-title>` | Episode title |
| `category`   | `<category>`  | String or array of strings |
| `season` + `episode` | `<episode-num>` | Converted to `xmltv_ns` format |
| `icon`       | `<icon>`      | Program image URL |
| `image`      | `<icon>`      | Alternative to `icon` |
| `director`   | `<credits><director>` | Array of strings |
| `actors`     | `<credits><actor>` | Array of strings |
| `writer`     | `<credits><writer>` | Array of strings |
| `producer`   | `<credits><producer>` | Array of strings |
| `presenter`  | `<credits><presenter>` | Array of strings |
| `composer`   | `<credits><composer>` | Array of strings |
| `guest`      | `<credits><guest>` | Array of strings |

---

## 3. Grabber Pipeline

The grabber (`scripts/commands/epg/grab.ts`) follows this flow:

```
1. Load channels.xml
   └── Parse each <channel> element

2. For each channel, resolve the parser
   └── Load sites/<site>/config.js based on channel's `site` attribute

3. For each day (1..days):
   a. Build URL using config.url({ channel, date })
   b. Fetch the URL (with caching if configured)
   c. Pass response to config.parser({ content, channel, date })
   d. Collect returned programs

4. Merge all programs into XMLTV format
   └── Write guide.xml
```

### Key Components

| Module | Path | Purpose |
|--------|------|---------|
| Grab command | `scripts/commands/epg/grab.ts` | Entry point, orchestrates the pipeline |
| Config loader | `scripts/core/configLoader.ts` | Dynamically loads site configs |
| Queue | `scripts/core/queue.ts` | Manages concurrent HTTP requests |
| Guide model | `scripts/models/guide.ts` | XMLTV generation |
| Channel model | `scripts/models/channel.ts` | Channel data structure |

### CLI Options

```bash
npm run grab -- \
  --channels=sites/movistarplus.es/movistarplus.es.channels.xml \
  --maxConnections=3 \
  --days=2 \
  --timeout=10000
```

| Option | Default | Description |
|--------|---------|-------------|
| `--channels` | - | Path to channels.xml file |
| `--site` | - | Only grab for a specific site |
| `--maxConnections` | 1 | Concurrent HTTP connections |
| `--days` | 1 | Number of days to grab |
| `--timeout` | 30000 | HTTP timeout in ms |

---

## 4. Adding a New Channel

1. Find the `site_id` for the channel in the source's website/API
2. Add a `<channel>` element to `movistarplus.es.channels.xml`:
   ```xml
   <channel site="movistarplus.es" lang="es" xmltv_id="" site_id="new_id">Channel Name</channel>
   ```
3. Validate the XML:
   ```bash
   npm run channels:lint -- sites/movistarplus.es/movistarplus.es.channels.xml
   ```
4. Test the grab:
   ```bash
   npm run grab -- --channels=sites/movistarplus.es/movistarplus.es.channels.xml --days=1
   ```

---

## 5. Adding a New Source (Site)

1. Create directory: `sites/<domain>/`
2. Create config: `sites/<domain>/<domain>.config.js` (see `web-scraping-patterns` skill)
3. Create test: `sites/<domain>/<domain>.test.js` with fixtures in `__data__/`
4. Add channels to the master file with `site="<domain>"`
5. Run tests: `npm test`

---

## 6. Common Issues

- **Empty guide for a channel**: Check that `site_id` in the channels.xml matches what the source expects. Test with `npm run grab -- --site=<domain> --days=1`.
- **Wrong times**: Verify timezone handling. Times should be in UTC in the output. Check with `TZ=Pacific/Nauru` to catch timezone bugs.
- **Duplicate programs**: The grabber may fetch overlapping time ranges. The XMLTV writer deduplicates by start time.
- **Missing descriptions**: Some parsers make secondary requests for details. Check that axios mocking in tests covers all URLs.
