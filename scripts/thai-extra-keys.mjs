/**
 * Remove Thai dictionary entries whose keys upstream 0.1.5 no longer declares.
 *
 * The fork's Thai dictionaries predate upstream's 0.1.5 key-set changes; a key
 * the `en` dictionary does not carry is dead copy (or belongs to a feature this
 * port parked), and the typed register call rejects it as an excess property.
 * Run with `--fix` to delete those lines in place.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const fix = args.includes('--fix')
const refArg = args.find(arg => arg.startsWith('--ref='))
const refName = refArg ? refArg.slice('--ref='.length) : 'en'
const files = args.filter(arg => arg !== '--fix' && !arg.startsWith('--ref='))
const keyPattern = /^\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:/

/** Line span and key set of one `export const <name> = {` block. */
function blockOf(lines, name) {
  const start = lines.findIndex(line => new RegExp(`^export const ${name}\\b`).test(line))
  if (start === -1) return null
  const end = lines.findIndex((line, index) => index > start && /^\}/.test(line))
  const keys = new Set()
  for (let i = start + 1; i < end; i++) {
    const match = keyPattern.exec(lines[i])
    if (match) keys.add(match[1] ?? match[2] ?? match[3])
  }
  return { start, end, keys }
}

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n')
  const en = blockOf(lines, refName)
  const th = blockOf(lines, 'th') ?? blockOf(lines, 'accessTh')
  if (!en || !th) {
    console.log(`${file}: no en/th pair found`)
    continue
  }
  const drop = []
  for (let i = th.start + 1; i < th.end; i++) {
    const match = keyPattern.exec(lines[i])
    if (match && !en.keys.has(match[1] ?? match[2] ?? match[3])) drop.push(i)
  }
  console.log(`${file}: ${drop.length} dead key line(s)`)
  if (fix && drop.length > 0) {
    const dropped = new Set(drop)
    writeFileSync(file, lines.filter((_, index) => !dropped.has(index)).join('\n'))
  }
}
