# Agent Note: Thai fork port onto upstream 0.1.5

Status: implemented

English | [中文](2026-09-09-thai-fork-port-to-0.1.5.zh.md)

## Problem

This fork carried 15 commits of Thai localization, desktop packaging, an MCP settings manager, and an in-app updater on top of `dsh-0.1.1-rc.2`. Upstream released `dsh-v0.1.5-rc.2` 3,225 commits later and restructured the host and client layers: `packages/host/apiproxy` became `packages/api/*-controller`, `ui-conversation/src/client/chat` became `packages/client/ui-chat`, `packages/client/runtime` disappeared, and the session log moved to v3. A plain merge produced 345 conflicting files and would have left fork code referencing deleted modules, so the port had to be a resolution pass, not a merge commit.

## Decision

Port in a separate worktree (`thai-0.1.5` off `dsh-v0.1.5-alpha.1`, later merged forward to `dsh-v0.1.5-rc.2`) so the running 0.1.1 checkout and its uncommitted work stay untouched, then merge `thai` into it and resolve by rule:

- **Version-only `package.json` conflicts (231)** take upstream. Fork releases renumber at release time, not per file.
- **Superseded feature files take upstream.** 0.1.5 already carries the turn rail (`ui-chat` `TurnNavigator` + `turn-rail-items`), the image card in `ui-tool`, the trajectory locale seat, and the win32 dialog foreground fix; the fork's parallel implementations are dropped rather than merged, including the chat dock components (`PromptNavigator`, `ThinkingDock`, `TurnCompletedSteps`, `scratchpad`) that upstream's `ui-chat` surface replaces.
- **Packages upstream deleted** (`host/apiproxy`, `client/runtime`, `examples`, `tool-subagent-report`, `acp-snapshot`) are accepted as deleted. The fork features that lived in them (MCP settings manager, in-app update RPC) are parked for a follow-up port onto the Typert remote architecture; their client UI and tests are parked with them. The mcp-client status store that fed that manager (`src/status.ts` plus the `startConnection` and `syncTools` sink parameters) is dropped for the same reason, which leaves `packages/mcp/mcp-client` identical to upstream.
- **Thai locale is kept and re-applied.** `LOCALE_IDS` already carried `th`; what was missing was coverage after upstream's key-set changes.
- **Fork-only fixes re-apply on upstream's new code**: the pi-ai thinking-only promotion and embedded tool-call recovery land on upstream's `toStreamChunks`, which already had the pending-reasoning buffer.
- **Desktop packaging stays.** The fork's WinForms `desktop-host/` launches `apps/cli/lib/bin.js web`, which 0.1.5 still provides; upstream's own `apps/desktop` (Electron) is a separate product and is left untouched.

## Locale typing

Upstream's `register()` demanded a complete dictionary for every shipped locale. Requiring Thai everywhere would have blocked the build on the ~15 UI packages upstream added after the fork, so `REQUIRED_LOCALE_IDS` (`zh`, `en`) now marks the mandatory pair and the Thai slot is `Partial`. The lookup chain already resolves a missing key per key — `th` falls back to `en` — so an untranslated key renders English instead of failing. Thai dictionaries declared `satisfies Record<Key, string>` were relaxed to `Partial` and their dead keys (upstream renamed or removed them) were dropped.

## Blast radius

- 25 Thai dictionaries plus `packages/client/locale` (registration contract, `REQUIRED_LOCALE_IDS`, `th` locale definition).
- `packages/bundle/{headless,web-app}/cordis.patch.yml`: upstream's `personaPrefix`/`personaSuffix` split carries the fork's MCP memory hint in the suffix.
- `ui-settings-models`: `WELCOME_NOTICE_COPY` restored to `onboarding-copy.ts` with its import, and the Thai dictionary relaxed to partial.
- `ui-conversation`: `PLAN_NEXT_ACTION_TH` added; `loadThrough` takes `SessionSeq` to match the session-controller client.
- `.gitignore` keeps the fork's desktop and generator build outputs.
- The `dsh-v0.1.5-rc.2` merge-forward conflicted in 8 files: the three `directory-picker-native` dialog modules, `ui-deliverables`, `ui-message-feedback`, and `ui-sidebar`'s `index.ts`, `mcp-client/src/tools.ts`, and the generated `THIRD_PARTY_NOTICES.md`.

## Alternatives considered

**Merge upstream into the 0.1.1 fork instead of porting the fork forward.** Rejected: the base predates the host-and-client restructure by ~3,200 commits, so the merge conflicts structurally (345 files) and leaves fork code importing deleted modules; resolving that on the release branch would have put an unbuildable tree in front of the app the user runs.

**Ship the Thai locale as an out-of-tree skin over upstream.** Rejected for this port: every UI package carries its own `locales.ts`, so a skin would need a per-package seam the packages do not have.

**Re-implement the fork's features one by one on 0.1.5.** Rejected: the 25 Thai dictionaries are the bulk of the delta, and re-translating them against upstream's renamed key sets costs more than resolving the port's conflicts.

**Carry the packages upstream deleted forward as private packages.** Rejected: `packages/api/*-controller` owns the same RPC surface with a different assembly, so keeping both mounts two live registrations for one client.

## Consequences

The port is a branch, not a tracked merge of upstream history, so every future upstream sync repeats the same resolution pass. Thai falls back to English wherever upstream added keys after the port — the `Partial` slot keeps `th` out of the build's completeness requirement — so new UI renders English until it is translated. The parked MCP settings manager and in-app updater leave Settings without them until the follow-up lands on the `*-controller` home. Bought: the desktop app runs on 0.1.5 with the session-log v3 pipeline, upstream's chat surface, and upstream's win32 picker fix, while keeping the Thai locale and the WinForms desktop host.

## Follow-ups

- Port the MCP settings manager and the in-app updater onto a Typert remote (they were `host/apiproxy` domains; the new home is a `*-controller` package beside `settings-controller`).
- Translate the UI packages upstream added after the fork; they currently render English under the Thai locale.
