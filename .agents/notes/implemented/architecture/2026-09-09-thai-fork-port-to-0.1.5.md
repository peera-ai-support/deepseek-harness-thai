# Agent Note: Thai fork port onto upstream 0.1.5-alpha.1

Status: implemented

English | [中文](2026-09-09-thai-fork-port-to-0.1.5.zh.md)

## Problem

This fork carried 15 commits of Thai localization, desktop packaging, an MCP
settings manager, and an in-app updater on top of `dsh-0.1.1-rc.2`. Upstream
released `dsh-v0.1.5-alpha.1` 2,942 commits later and restructured the host and
client layers: `packages/host/apiproxy` became `packages/api/*-controller`,
`ui-conversation/src/client/chat` became `packages/client/ui-chat`,
`packages/client/runtime` disappeared, and the session log moved to v3. A plain
merge produced 345 conflicting files and would have left fork code referencing
deleted modules, so the port had to be a resolution pass, not a merge commit.

## Decision

Port in a separate worktree (`thai-0.1.5` off `dsh-v0.1.5-alpha.1`) so the
running 0.1.1 checkout and its uncommitted work stay untouched, then merge
`thai` into it and resolve by rule:

- **Version-only `package.json` conflicts (231)** take upstream. Fork releases
  renumber at release time, not per file.
- **Superseded feature files take upstream.** 0.1.5 already carries the turn
  rail (`ui-chat` `TurnNavigator` + `turn-rail-items`), the image card in
  `ui-tool`, the trajectory locale seat, and the win32 dialog foreground fix;
  the fork's parallel implementations are dropped rather than merged.
- **Packages upstream deleted** (`host/apiproxy`, `client/runtime`,
  `examples`, `tool-subagent-report`, `acp-snapshot`) are accepted as deleted.
  The fork features that lived in them (MCP settings manager, in-app update
  RPC) are parked for a follow-up port onto the Typert remote architecture;
  their client UI and tests are parked with them.
- **Thai locale is kept and re-applied.** `LOCALE_IDS` already carried `th`;
  what was missing was coverage after upstream's key-set changes.
- **Fork-only fixes re-apply on upstream's new code**: the pi-ai
  thinking-only promotion and embedded tool-call recovery land on upstream's
  `toStreamChunks`, which already had the pending-reasoning buffer.
- **Desktop packaging stays.** The fork's WinForms `desktop-host/` launches
  `apps/cli/lib/bin.js web`, which 0.1.5 still provides; upstream's own
  `apps/desktop` (Electron) is a separate product and is left untouched.

## Locale typing

Upstream's `register()` demanded a complete dictionary for every shipped
locale. Requiring Thai everywhere would have blocked the build on the ~15 UI
packages upstream added after the fork, so `REQUIRED_LOCALE_IDS` (`zh`, `en`)
now marks the mandatory pair and the Thai slot is `Partial`. The lookup chain
already resolves a missing key per key — `th` falls back to `en` — so an
untranslated key renders English instead of failing. Thai dictionaries
declared `satisfies Record<Key, string>` were relaxed to `Partial` and their
dead keys (upstream renamed or removed them) were dropped.

## Blast radius

- 25 Thai dictionaries plus `packages/client/locale` (registration contract,
  `REQUIRED_LOCALE_IDS`, `th` locale definition).
- `packages/bundle/{headless,web-app}/cordis.patch.yml`: upstream's
  `personaPrefix`/`personaSuffix` split carries the fork's MCP memory hint in
  the suffix.
- `ui-settings-models`: `WELCOME_NOTICE_COPY` restored to `onboarding-copy.ts`
  with its import, and the Thai dictionary relaxed to partial.
- `ui-conversation`: `PLAN_NEXT_ACTION_TH` added; `loadThrough` takes
  `SessionSeq` to match the session-controller client.
- `.gitignore` keeps the fork's desktop and generator build outputs.

## Follow-ups

- Port the MCP settings manager and the in-app updater onto a Typert remote
  (they were `host/apiproxy` domains; the new home is a `*-controller`
  package beside `settings-controller`).
- Wire the parked chat dock components (`PromptNavigator`, `ThinkingDock`,
  `TurnCompletedSteps`, `scratchpad`) into `ui-chat`, or retire them in favour
  of upstream's chat surface.
- Translate the UI packages upstream added after the fork; they currently
  render English under the Thai locale.
