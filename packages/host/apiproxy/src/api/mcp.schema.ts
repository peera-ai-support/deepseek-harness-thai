/**
 * mcp domain zod schemas (names derived from map keys).
 */

import { z } from 'zod'
import type { McpHeaderOrEnv, McpServerEntry, McpValue } from './mcp.ts'
import type { RequestPayload, ResponseValue } from './rpc-map.ts'
import type { Wire } from './rpc.schema.ts'

/** env-name shape shared by env-ref values. */
const envNameSchema = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/)

/** One config value: literal text or a load-time env read. */
const mcpValueSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('literal'), value: z.string() }),
  z.object({
    kind: z.literal('env'),
    env: envNameSchema,
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  }),
]) satisfies z.ZodType<Wire<McpValue>>

/** one header/env key. */
const mcpHeaderOrEnvSchema = z.object({
  name: z.string().min(1),
  value: mcpValueSchema,
}) satisfies z.ZodType<Wire<McpHeaderOrEnv>>

/** one MCP server row. */
export const mcpServerEntrySchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/),
  serverName: z.string().regex(/^[A-Za-z0-9_-]{1,32}$/),
  transport: z.enum(['streamable-http', 'stdio']),
  url: z.url().optional(),
  headers: z.array(mcpHeaderOrEnvSchema),
  command: z.string().min(1).optional(),
  args: z.array(z.string()),
  cwd: z.string().optional(),
  env: z.array(mcpHeaderOrEnvSchema),
  extra: z.array(z.string()),
}).superRefine((entry, ctx) => {
  if (entry.transport === 'streamable-http' && entry.url === undefined) {
    ctx.addIssue({ code: 'custom', message: 'streamable-http server needs a url' })
  }
  if (entry.transport === 'stdio' && entry.command === undefined) {
    ctx.addIssue({ code: 'custom', message: 'stdio server needs a command' })
  }
}) satisfies z.ZodType<Wire<McpServerEntry>>

/** mcp.listServers request payload (empty object literal). */
export const mcpListServersRequestSchema = z.object({}) satisfies z.ZodType<Wire<RequestPayload<'mcp.listServers'>>>

/** mcp.listServers response value. */
export const mcpListServersValueSchema = z.object({
  servers: z.array(mcpServerEntrySchema),
  filePath: z.string(),
}) satisfies z.ZodType<Wire<ResponseValue<'mcp.listServers'>>>

/** mcp.upsertServer request payload. */
export const mcpUpsertServerRequestSchema = z.object({
  server: mcpServerEntrySchema,
}) satisfies z.ZodType<Wire<RequestPayload<'mcp.upsertServer'>>>

/** mcp.upsertServer response value. */
export const mcpUpsertServerValueSchema = z.object({
  servers: z.array(mcpServerEntrySchema),
}) satisfies z.ZodType<Wire<ResponseValue<'mcp.upsertServer'>>>

/** mcp.removeServer request payload. */
export const mcpRemoveServerRequestSchema = z.object({
  id: z.string().min(1),
}) satisfies z.ZodType<Wire<RequestPayload<'mcp.removeServer'>>>

/** mcp.removeServer response value. */
export const mcpRemoveServerValueSchema = z.object({
  servers: z.array(mcpServerEntrySchema),
}) satisfies z.ZodType<Wire<ResponseValue<'mcp.removeServer'>>>

/** mcp.status request payload (empty object literal). */
export const mcpStatusRequestSchema = z.object({}) satisfies z.ZodType<Wire<RequestPayload<'mcp.status'>>>

/** mcp.status response value. */
export const mcpStatusValueSchema = z.object({
  statuses: z.array(z.object({
    serverName: z.string(),
    phase: z.enum(['connecting', 'connected', 'reconnecting', 'disabled']),
    attempt: z.number().int().positive().optional(),
    delayMs: z.number().positive().optional(),
  })),
}) satisfies z.ZodType<Wire<ResponseValue<'mcp.status'>>>
