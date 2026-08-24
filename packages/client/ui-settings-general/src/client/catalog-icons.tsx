/** Generic catalog icons for local MCP servers (no single brand mark to reuse). */

/** Memory icon: stacked rows suggesting persistence. */
export function MemoryIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="5" y="6" width="22" height="9" rx="2" fill="#8896ab" />
      <rect x="5" y="17" width="22" height="9" rx="2" fill="#6b7a92" />
      <circle cx="10" cy="10.5" r="1.6" fill="#ffffff" />
      <circle cx="10" cy="21.5" r="1.6" fill="#ffffff" />
    </svg>
  )
}

/** Filesystem icon: open folder. */
export function FolderIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 8.5C4 7.4 4.9 6.5 6 6.5H12L14.6 9H26C27.1 9 28 9.9 28 11V23C28 24.1 27.1 25 26 25H6C4.9 25 4 24.1 4 23V8.5Z" fill="#8fa3c4" />
      <rect x="0" y="0" width="32" height="32" fill="none" />
    </svg>
  )
}
