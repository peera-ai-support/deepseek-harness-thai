# Agent Note: fork-only surface is accounted for inside the upstream documentation gates

Status: implemented

English | [中文](2026-09-12-fork-surface-accounted-for-in-upstream-doc-gates.zh.md)

## Problem

The fork adds surface the upstream documentation gates do not know about, and those gates fail closed. `packages/mcp/mcp-client/src/status.ts` publishes `ctx.mcpStatus`, a Context key the Cordis catalog's partition check sees declared but rendered nowhere, so `gen-cordis-catalog --check` threw instead of reporting staleness. `packages/session/session-turn-outline` carries the upstream README verbatim, but the fork's copy of `verify-package-readme-model-experience.ts` predates that package (130 audited packages against upstream's 158), so the checker had no entry for its Model Experience sentence. Both failures are the fork's, not the change under review, and both block `pnpm run doc-sync`.

## Decision

Each fork-visible surface is accounted for inside the gate that already owns it, at the point where that gate keeps its register:

- `SERVICE_WALK_EXEMPTIONS` gains `mcpStatus`, naming `packages/mcp/mcp-client/README.md` as the documentation owner, and that README documents the store so the named owner is real.
- `SENTENCE_MODEL_EXPERIENCE` gains the `packages/session/session-turn-outline` entry upstream already carries, matching the README sentence the fork inherited.

Neither gate gains a blanket exemption or a relaxed rule: an entry states why the surface is not walkable and who documents it, and the two curated maps stay the only place those facts live.

## Alternatives considered

**Replace the fork's copies of the two generator scripts with upstream's.** Rejected here: both fork copies predate upstream's (12 insertions against 40 deletions in the checker, 23 against 168 in the Cordis catalog generator), so this is the port's decision to make on the 0.1.5 branch, not a doc-sync repair on this branch.

**Make `ctx.mcpStatus` renderable and map it in `SERVICE_PAGE`.** Rejected: the rendering projection walks Cordis Service Definitions with documented methods, while the store is a plain class provided on the root; rendering it would mean changing the projection rather than declaring the service.

**Exempt the key without naming a documentation owner.** Rejected: the exemption string is the only record of where that API is documented, so an entry without an owner turns the gate green while leaving `ctx.mcpStatus` undocumented.

**Reshape the fork's surface until the gates pass unmodified.** Rejected: the status store is a real published service and the turn-outline README is upstream's own text; changing either to satisfy an older checker would trade a green gate for a wrong one.

## Consequences

`pnpm run doc-sync` no longer fails on the fork's own surface, and the next fork-added service or package README fails loudly until it is accounted for the same way. The cost is upkeep: `SERVICE_WALK_EXEMPTIONS` and `SENTENCE_MODEL_EXPERIENCE` are curated lists the fork now diverges from, so an upstream sync conflicts with them textually rather than semantically and each conflict has to be resolved by re-checking the entry against the merged surface.
