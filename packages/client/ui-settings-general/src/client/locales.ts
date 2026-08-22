/** Shell chrome and General-nav dictionaries; feature rows own their copy. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'trigger': '设置',
  'title': '设置',
  'close': '关闭',
  'openDocument': '打开配置文件',
  'openDocument.error': '无法打开配置文件',
  'general.nav': '通用设置',
  'about.nav': '关于',
  'about.version': '版本',
  'about.repo': '项目目录',
  'about.check': '检查更新',
  'about.checking': '检查中…',
  'about.upToDate': '已是最新版本（{latest}）',
  'about.updateAvailable': '有新版本可用：{latest}',
  'about.updateHint': '在终端中运行以下命令完成更新：',
  'about.checkFailed': '检查更新失败，请重试',
  'about.notGit': '此安装不是 git 检出目录，无法检查更新',
  'about.noTags': '未找到发布标签',
} satisfies Record<string, string>

/** The settings namespace key union. */
export type SettingsKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'trigger': 'Settings',
  'title': 'Settings',
  'close': 'Close',
  'openDocument': 'Open configuration file',
  'openDocument.error': 'Could not open configuration file',
  'general.nav': 'General',
  'about.nav': 'About',
  'about.version': 'Version',
  'about.repo': 'Project directory',
  'about.check': 'Check for updates',
  'about.checking': 'Checking…',
  'about.upToDate': 'Up to date ({latest})',
  'about.updateAvailable': 'New version available: {latest}',
  'about.updateHint': 'Run this in a terminal to update:',
  'about.checkFailed': 'Update check failed, please try again',
  'about.notGit': 'This installation is not a git checkout — updates cannot be checked',
  'about.noTags': 'No release tags found',
} satisfies Record<SettingsKey, string>

/** Thai dictionary, checked complete against the shipped key set. */
export const th = {
  'trigger': 'การตั้งค่า',
  'title': 'การตั้งค่า',
  'close': 'ปิด',
  'openDocument': 'เปิดไฟล์การตั้งค่า',
  'openDocument.error': 'ไม่สามารถเปิดไฟล์การตั้งค่าได้',
  'general.nav': 'ทั่วไป',
  'about.nav': 'เกี่ยวกับแอป',
  'about.version': 'เวอร์ชั่น',
  'about.repo': 'ที่ตั้งโปรเจกต์',
  'about.check': 'ตรวจอัปเดต',
  'about.checking': 'กำลังตรวจ…',
  'about.upToDate': 'เป็นเวอร์ชั่นล่าสุดแล้ว ({latest})',
  'about.updateAvailable': 'มีเวอร์ชั่นใหม่: {latest}',
  'about.updateHint': 'รันคำสั่งนี้ใน terminal เพื่ออัปเดต:',
  'about.checkFailed': 'ตรวจอัปเดตล้มเหลว กรุณาลองใหม่',
  'about.notGit': 'การติดตั้งนี้ไม่ใช่ git checkout — ไม่สามารถตรวจอัปเดตได้',
  'about.noTags': 'ไม่พบ tag เวอร์ชั่น',
} satisfies Record<SettingsKey, string>
