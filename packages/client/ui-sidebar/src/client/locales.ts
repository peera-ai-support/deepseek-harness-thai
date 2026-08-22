/** `sidebar` namespace dictionaries: shell controls (brand row, New Session, fold toggle). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'session.new': '新会话',
  'session.new.label': '新建会话',
  'toggle.open': '打开侧边栏',
  'toggle.collapse': '收起侧边栏',
} satisfies Record<string, string>

/** The sidebar namespace key union. */
export type SidebarKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'session.new': 'New Session',
  'session.new.label': 'New session',
  'toggle.open': 'Open sidebar',
  'toggle.collapse': 'Collapse sidebar',
} satisfies Record<SidebarKey, string>

/** Thai dictionary, checked complete against the shipped key set. */
export const th = {
  'session.new': 'เซสชันใหม่',
  'session.new.label': 'สร้างเซสชันใหม่',
  'toggle.open': 'เปิดแถบข้าง',
  'toggle.collapse': 'ย่อแถบข้าง',
} satisfies Record<SidebarKey, string>
