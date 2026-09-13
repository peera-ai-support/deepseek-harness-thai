/**
 * Relax every Thai dictionary declaration in the ported fork to `Partial`.
 *
 * The fork ships Thai for the packages it translated; upstream 0.1.5 added
 * keys and packages afterwards. The locale service resolves a missing key
 * through the locale's fallback chain, so a partial Thai dictionary renders
 * English for the keys it does not carry instead of failing the build.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const files = execFileSync('git', ['grep', '-l', 'export const th', '--', 'packages/**/locales.ts'], {
  encoding: 'utf8',
}).trim().split('\n').filter(Boolean)

let changed = 0
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n')
  let inThai = false
  let touched = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^export const th\b/.test(line)) {
      inThai = true
      const typed = /^export const th: Record<(.+), string> = \{$/.exec(line)
      if (typed) {
        lines[i] = `export const th: Partial<Record<${typed[1]}, string>> = {`
        touched = true
      }
      continue
    }
    if (inThai && /^\} satisfies Record<(.+), string>$/.test(line)) {
      const key = /^\} satisfies Record<(.+), string>$/.exec(line)[1]
      lines[i] = `} satisfies Partial<Record<${key}, string>>`
      touched = true
      inThai = false
    }
  }
  if (touched) {
    writeFileSync(file, lines.join('\n'))
    changed++
  }
}
console.log(`relaxed ${changed} file(s)`)
