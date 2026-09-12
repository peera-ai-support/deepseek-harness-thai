# Agent Note: system-prompt memory hint (auto-consult the MCP memory server)

Status: implemented

English | [中文](2026-08-24-memory-hint-system-prompt.zh.md)

## Problem

The MCP memory server (official `@modelcontextprotocol/server-memory`) was connected and working, but the model only consulted it when the user explicitly asked "use your memory". A question about previously stated facts (e.g. computer specs) triggered local shell probing instead — the memory tools exist but nothing instructed the model to prefer them.

## Decision

Add a short hint to the deployment persona (the same text in every place the persona is authored):

> When the MCP memory server is available, check it first: if this conversation or an earlier one may have recorded relevant facts, search the memory graph and ground your answer in them. When the user states durable personal facts or decisions (specs, settings, preferences, choices), record them in the memory graph before continuing.

The hint is deliberately conditional ("when available"): deployments without an MCP memory server lose nothing, and the model keeps using its normal tools (shell, fs) for everything else.

## Blast radius

- Persona authored in four places, all updated together: `apps/cli/config/agent-presets/standard/agent.cordis.yml` (the desktop web app's default preset — the one that actually drives user sessions), `apps/cli/config/agent-presets/code/agent.cordis.yml`, `packages/bundle/web-app/cordis.patch.yml`, `packages/bundle/headless/cordis.patch.yml`.
- Keyless replay snapshot `apps/web/tests/snapshots/fresh-round-trip/system-prompt.expected.md` updated to the new persona (the e2e replay assembles the prompt from the same sources; the other acp-agent snapshots do not include the short persona line).

## Alternatives considered

**Leave discovery to the model.** Rejected: the failure that motivated the hint was the model probing the local shell for facts the memory graph already held — the tools were reachable, just unpreferred.

**Make the hint unconditional.** Rejected: deployments without an MCP memory server would receive an instruction they cannot follow, so the hint is conditional on availability.

**Rely on the memory server's own tool descriptions.** Rejected: they come from the third-party `@modelcontextprotocol/server-memory` and describe what each tool does, not when to prefer it over the deployment's other tools.

## Consequences

Every session that uses the `standard` or `code` preset, or the web-app or headless bundle, now carries the hint in its system prompt — including deployments with no memory server, which pay the tokens for an instruction they cannot act on. The persona is authored in four places, so changing the hint means four files plus the keyless replay snapshot.

## Follow-ups

- Per-icon catalog presets are unchanged; if the harness ever ships a memory server by default, the conditional in the hint could become unconditional.
