/** Locale namespace owned by Session export browser feedback. */
export const NS = 'session-log-download'

/** Simplified-Chinese Session export strings. */
export const zh = {
  'dialog.preparingTitle': '正在导出 Session',
  'dialog.preparingDescription': '正在准备包含当前 Session、子 Session 和附件的 ZIP 文件。',
  'dialog.successTitle': 'Session 导出已开始下载',
  'dialog.successDescription': '浏览器正在下载 Session ZIP 文件。',
  'dialog.errorTitle': 'Session 导出失败',
  'dialog.close': '关闭',
  'dialog.commandFailed': '无法启动 Session 导出。',
} as const

/** English Session export strings. */
export const en: Record<keyof typeof zh, string> = {
  'dialog.preparingTitle': 'Exporting Session',
  'dialog.preparingDescription': 'Preparing a ZIP containing this Session, its sub-Sessions, and attachments.',
  'dialog.successTitle': 'Session download started',
  'dialog.successDescription': 'The browser is downloading the Session ZIP.',
  'dialog.errorTitle': 'Session export failed',
  'dialog.close': 'Close',
  'dialog.commandFailed': 'Could not start the Session export.',
}

/** Thai dictionary, checked complete against the shipped key set. */
export const th: Record<keyof typeof zh, string> = {
  'dialog.preparingTitle': 'กำลังส่งออกเซสชัน',
  'dialog.preparingDescription': 'กำลังเตรียมไฟล์ ZIP ที่มีเซสชันนี้ เซสชันย่อย และไฟล์แนบ',
  'dialog.successTitle': 'เริ่มดาวน์โหลดเซสชันแล้ว',
  'dialog.successDescription': 'เบราว์เซอร์กำลังดาวน์โหลดไฟล์ ZIP ของเซสชัน',
  'dialog.errorTitle': 'การส่งออกเซสชันล้มเหลว',
  'dialog.close': 'ปิด',
  'dialog.commandFailed': 'ไม่สามารถเริ่มการส่งออกเซสชันได้',
}


/** Stable locale keys consumed by the shared modal. */
export type SessionLogDownloadKey = keyof typeof zh
