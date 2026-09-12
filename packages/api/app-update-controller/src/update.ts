/**
 * Git and pnpm plumbing behind the in-app updater: locate the checkout, read
 * its version, resolve the newest release tag from the remote's advertised
 * default branch, and run one bounded command per stage. Child processes take
 * the scrubbed parent environment, so no credential-shaped variable reaches a
 * fetch, install, or build.
 *
 * @module @deepseek-ai/dsh-api-app-update-controller/src/update.ts
 */

import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { scrubbedParentEnv } from '@deepseek-ai/dsh-subprocess'

/** promisified execFile: stdout/stderr strings, options (cwd/env/timeout/signal) applied per call. */
const execFileAsync = promisify(execFile)

/** Per-command ceiling for one update stage; a full monorepo install or build runs long. */
export const UPDATE_COMMAND_TIMEOUT_MS = 30 * 60_000

/** Fetch and read commands are bounded far tighter than the build stages. */
export const UPDATE_READ_TIMEOUT_MS = 60_000

/** One bound git runner: args in, trimmed stdout out. */
export type GitRunner = (args: readonly string[]) => Promise<string>

/**
 * The app checkout root: the first ancestor of `from` holding both
 * `pnpm-workspace.yaml` and `package.json`.
 * @param from - directory the walk starts at; defaults to this module's own directory.
 * @returns the checkout root, or undefined when the installation is not a checkout.
 */
export function findAppRoot(from = dirname(fileURLToPath(import.meta.url))): string | undefined {
  for (let dir = from; ; ) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) && existsSync(join(dir, 'package.json'))) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

/**
 * The checkout's root version.
 * @param appRoot - checkout root holding `package.json`.
 * @returns the declared version, or 'unknown' when the manifest is unreadable or has none.
 */
export function readAppVersion(appRoot: string): string {
  try {
    const manifest = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8')) as { version?: unknown }
    return typeof manifest.version === 'string' && manifest.version !== '' ? manifest.version : 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Strip the release tag prefixes (`dsh-v`, `thai-`, `v`) so a tag compares
 * against a `package.json` version. The publish repository tags releases
 * `thai-<version>`; upstream tags them `dsh-v<version>`.
 * @param tag - a release tag as the remote reports it.
 * @returns the bare version the tag names.
 */
export function normalizeVersionTag(tag: string): string {
  return tag.replace(/^dsh-v/i, '').replace(/^thai-/i, '').replace(/^v/i, '')
}

/**
 * The newest release tag on the remote's default branch. The branch is
 * resolved from the remote-advertised HEAD (`git ls-remote --symref origin
 * HEAD`), never hardcoded, so a release repository may name its main branch
 * freely. `git describe --tags` then picks the tag at the branch tip by commit
 * ancestry, which is the latest release.
 * @param runGit - a git runner bound to the checkout.
 * @returns the tag, or null when no branch resolves or no tag is reachable from it.
 */
export async function resolveLatestReleaseTag(runGit: GitRunner): Promise<string | null> {
  const head = await runGit(['ls-remote', '--symref', 'origin', 'HEAD'])
  const branch = /^ref:\s+refs\/heads\/(\S+)\s+HEAD$/m.exec(head.trim())?.[1]
  if (branch === undefined) return null
  try {
    return await runGit(['describe', '--tags', '--abbrev=0', `origin/${branch}`])
  } catch {
    // No tag reachable on the default branch (a fresh repository) — not an error.
    return null
  }
}

/**
 * Bind a git runner to one checkout.
 * @param repoRoot - checkout the commands run in.
 * @param signal - the caller's abort signal.
 * @param timeoutMs - per-command ceiling.
 * @returns a runner that resolves to trimmed stdout.
 */
export function gitRunner(repoRoot: string, signal: AbortSignal, timeoutMs: number): GitRunner {
  return async args => (await execFileAsync(
    'git',
    [...args],
    { cwd: repoRoot, env: scrubbedParentEnv(), timeout: timeoutMs, windowsHide: true, signal },
  )).stdout.trim()
}

/**
 * Run one pnpm command in the checkout. Windows has no pnpm shim node can
 * spawn directly (`pnpm.cmd` -> EINVAL, bare `pnpm` -> ENOENT), so win32 wraps
 * the command in `cmd.exe /c`; elsewhere it runs under `sh -c`.
 * @param repoRoot - checkout the command runs in.
 * @param args - pnpm arguments (for example `['install']`).
 * @param signal - the caller's abort signal.
 * @param timeoutMs - per-command ceiling.
 * @returns the child's completed stdout and stderr.
 */
export async function runPnpm(
  repoRoot: string,
  args: readonly string[],
  signal: AbortSignal,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string }> {
  const options = {
    cwd: repoRoot,
    env: scrubbedParentEnv(),
    timeout: timeoutMs,
    signal,
    maxBuffer: 64 * 1024 * 1024,
  }
  return process.platform === 'win32'
    ? execFileAsync('cmd.exe', ['/c', 'pnpm', ...args], { ...options, windowsHide: true })
    : execFileAsync('sh', ['-c', ['pnpm', ...args].join(' ')], options)
}
