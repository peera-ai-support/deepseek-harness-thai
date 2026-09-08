/** `deliverables` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'deliverables'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'produced.label': '产物',
  'produced.moreOne': '+ 1 个文件',
  'produced.more': '+ {count} 个文件',
  'produced.open': '打开 {name}',
}

/** English dictionary (same key set). */
export const en: Record<DeliverablesKey, string> = {
  'produced.label': 'Produced',
  'produced.moreOne': '+ 1 file',
  'produced.more': '+ {count} files',
  'produced.open': 'Open {name}',
}

/** Thai dictionary, checked complete against the shipped key set. */
export const th: Partial<Record<DeliverablesKey, string>> = {
  'produced.label': 'ผลลัพธ์ที่สร้าง',
  'produced.moreOne': '+ อีก 1 ไฟล์',
  'produced.more': '+ อีก {count} ไฟล์',
  'produced.open': 'เปิด {name}',
}


/** Union of this namespace's dictionary keys. */
export type DeliverablesKey = keyof typeof zh
