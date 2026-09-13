/** Naming for MCP values exported as Windows user-environment variables. */

/**
 * Derive the environment variable a pasted literal secret is exported under.
 * @param serverName - MCP server row owning the value.
 * @param key - header or environment key that held the secret.
 * @returns the `DSH_MCP_<SERVER>_<KEY>` variable name.
 */
export function secretEnvName(serverName: string, key: string): string {
  const clean = (text: string) => (text.toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'X')
  return `DSH_MCP_${clean(serverName)}_${clean(key)}`
}
