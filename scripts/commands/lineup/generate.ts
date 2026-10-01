import { Command } from 'commander'
import fs from 'fs-extra'
import { buildLineup, parseGuideChannelIds, parseM3u } from './lineup'

// The M3U URL is private: it is read from the environment only and must never be logged,
// written to disk or included in the generated lineup.
const program = new Command()

program
  .option('-g, --guide <path>', 'Path to the XMLTV guide', 'guide.xml')
  .option('-o, --output <path>', 'Path to the generated lineup', 'lineup.json')
  .parse(process.argv)

const options = program.opts<{ guide: string; output: string }>()

async function main() {
  const m3uUrl = process.env.M3U_URL
  if (!m3uUrl) {
    console.error('M3U_URL is not set, skipping lineup generation')
    process.exit(1)
  }

  if (!(await fs.pathExists(options.guide))) {
    console.error(`Guide not found: ${options.guide}`)
    process.exit(1)
  }

  let response: Response
  try {
    response = await fetch(m3uUrl, { signal: AbortSignal.timeout(30000) })
  } catch {
    console.error('Could not download the M3U list')
    process.exit(1)
  }
  if (!response.ok) {
    console.error(`Could not download the M3U list (HTTP ${response.status})`)
    process.exit(1)
  }

  const entries = parseM3u(await response.text())
  const epgChannelIds = parseGuideChannelIds(await fs.readFile(options.guide, 'utf8'))
  const lineup = buildLineup(entries, epgChannelIds)

  if (lineup.groups.length === 0) {
    console.error('No M3U channel matches the guide, keeping the previous lineup')
    process.exit(1)
  }

  await fs.writeFile(options.output, JSON.stringify(lineup, null, 2) + '\n')

  const matched = new Set(lineup.groups.flatMap(group => group.channels)).size
  console.log(
    `Lineup saved to ${options.output}: ${lineup.groups.length} groups, ` +
      `${matched}/${epgChannelIds.size} guide channels`
  )
}

main()
