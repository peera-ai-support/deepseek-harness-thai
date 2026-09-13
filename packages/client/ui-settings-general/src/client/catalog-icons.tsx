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

/** Brave Search / Web Search icon */
export function SearchIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#fb542b" fillOpacity="0.16" />
      <circle cx="14" cy="14" r="6.5" stroke="#fb542b" strokeWidth="2.5" />
      <line x1="18.5" y1="18.5" x2="25" y2="25" stroke="#fb542b" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

/** Fetch / Web Content Reader icon */
export function FetchIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#10b981" fillOpacity="0.16" />
      <circle cx="16" cy="16" r="8" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />
      <path d="M12 16L16 20L20 16M16 11V19" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Puppeteer / Browser automation icon */
export function BrowserIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#8b5cf6" fillOpacity="0.16" />
      <rect x="5" y="7" width="22" height="18" rx="3" stroke="#8b5cf6" strokeWidth="2" />
      <line x1="5" y1="12" x2="27" y2="12" stroke="#8b5cf6" strokeWidth="1.5" />
      <circle cx="8.5" cy="9.5" r="1" fill="#8b5cf6" />
      <circle cx="11.5" cy="9.5" r="1" fill="#8b5cf6" />
      <circle cx="14.5" cy="9.5" r="1" fill="#8b5cf6" />
    </svg>
  )
}

/** Database icon (SQLite / PostgreSQL) */
export function DatabaseIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0ea5e9" fillOpacity="0.16" />
      <ellipse cx="16" cy="10" rx="8" ry="3.5" stroke="#0ea5e9" strokeWidth="2" />
      <path d="M8 10V16C8 17.93 11.58 19.5 16 19.5C20.42 19.5 24 17.93 24 16V10" stroke="#0ea5e9" strokeWidth="2" />
      <path d="M8 16V22C8 23.93 11.58 25.5 16 25.5C20.42 25.5 24 23.93 24 22V16" stroke="#0ea5e9" strokeWidth="2" />
    </svg>
  )
}

/** Git icon */
export function GitIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#f05032" fillOpacity="0.16" />
      <circle cx="11" cy="11" r="2.5" stroke="#f05032" strokeWidth="2" />
      <circle cx="11" cy="21" r="2.5" stroke="#f05032" strokeWidth="2" />
      <circle cx="21" cy="16" r="2.5" stroke="#f05032" strokeWidth="2" />
      <path d="M11 13.5V18.5M11 16H16.5C17.6 16 18.5 16 18.5 16" stroke="#f05032" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
