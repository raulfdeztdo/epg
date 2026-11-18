import { Command } from 'commander'
import fs from 'fs-extra'
import { applyAliases, parseAliases } from './aliases'

const program = new Command()

program
  .option('-g, --guide <path>', 'Path to the XMLTV guide', 'guide.xml')
  .option(
    '-a, --aliases <path>',
    'Path to the JSON file with alternative channel names',
    'sites/movistarplus.es/movistarplus.es.aliases.json'
  )
  .option('-o, --output <path>', 'Path to the output guide (defaults to --guide)')
  .parse(process.argv)

const options = program.opts<{ guide: string; aliases: string; output?: string }>()

async function main() {
  if (!(await fs.pathExists(options.guide))) {
    console.error(`Guide not found: ${options.guide}`)
    process.exit(1)
  }

  let aliases
  try {
    aliases = parseAliases(await fs.readJson(options.aliases))
  } catch (error) {
    console.error(`Could not read ${options.aliases}: ${(error as Error).message}`)
    process.exit(1)
  }

  const output = options.output || options.guide
  const { xml, added, missingIds } = applyAliases(await fs.readFile(options.guide, 'utf8'), aliases)

  if (missingIds.length) {
    console.warn(`Channels in the aliases file but not in the guide: ${missingIds.join(', ')}`)
  }

  if (output !== options.guide || added > 0) {
    await fs.writeFile(output, xml)
  }

  console.log(
    `Added ${added} alternative name(s) to ${output} ` +
      `(${Object.keys(aliases).length - missingIds.length} channel(s) with aliases)`
  )
}

main()
