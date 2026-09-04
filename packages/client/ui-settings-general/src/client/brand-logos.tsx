/** Official Supabase emerald lightning mark */
export function SupabaseLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M13.4 2.1L3.9 14.3C3.6 14.7 3.9 15.3 4.4 15.3H11.5L10.6 21.9C10.5 22.4 11.2 22.7 11.5 22.3L21 10.1C21.4 9.7 21.1 9.1 20.6 9.1H13.5L14.4 2.5C14.5 2 13.8 1.7 13.4 2.1Z"
        fill="#3ecf8e"
      />
    </svg>
  )
}

/** Official Slack 4-color mark */
export function SlackLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M5.04 14.5a2.5 2.5 0 1 1-2.5-2.5h2.5v2.5zm1.25 0a2.5 2.5 0 1 1 5 0v6.25a2.5 2.5 0 1 1-5 0v-6.25z" fill="#E01E5A"/>
      <path d="M9.5 5.04a2.5 2.5 0 1 1-2.5-2.5v2.5h2.5zm0 1.25a2.5 2.5 0 1 1 0 5H3.25a2.5 2.5 0 1 1 0-5H9.5z" fill="#36C5F0"/>
      <path d="M18.96 9.5a2.5 2.5 0 1 1 2.5 2.5h-2.5V9.5zm-1.25 0a2.5 2.5 0 1 1-5 0V3.25a2.5 2.5 0 1 1 5 0V9.5z" fill="#2EB67D"/>
      <path d="M14.5 18.96a2.5 2.5 0 1 1 2.5 2.5v-2.5h-2.5zm0-1.25a2.5 2.5 0 1 1 0-5h6.25a2.5 2.5 0 1 1 0 5H14.5z" fill="#ECB22E"/>
    </svg>
  )
}

/** Official Docker blue whale mark */
export function DockerLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M2.5 13C2.5 16.5 5.5 19.5 9.5 19.5C14.5 19.5 19 16.5 20.5 13.5C21.5 13.5 22.5 12.5 22.5 11.5C22 11 20.5 11 19.5 11.5C18.5 9.5 16 8.5 13.5 8.5V9.5H16.5V11.5H13.5V12.5H18.5V13.5H12.5V8.5H10.5V10.5H7.5V8.5H4.5V10.5H2.5V13Z"
        fill="#2496ed"
      />
    </svg>
  )
}

/** Official Notion N mark */
export function NotionLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4.5 3.5h15c.55 0 1 .45 1 1v15c0 .55-.45 1-1 1h-15c-.55 0-1-.45-1-1v-15c0-.55.45-1 1-1zm3 3v11h2.5v-7.2l4.8 7.2h2.2v-11h-2.5v7.2l-4.8-7.2h-2.2z"/>
    </svg>
  )
}

/** Custom Desktop / Local executable app mark (e.g. lnwjud) */
export function CustomAppLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <circle cx="8" cy="10" r="1.5" fill="#f59e0b" />
      <circle cx="16" cy="10" r="1.5" fill="#f59e0b" />
      <path d="M10 13h4" />
    </svg>
  )
}

/** Official Vercel white triangle mark */
export function VercelLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 3L23 21H1L12 3Z" fill="#ffffff" />
    </svg>
  )
}
