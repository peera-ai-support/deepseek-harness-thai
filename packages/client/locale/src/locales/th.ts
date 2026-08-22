import type { CommonKey } from './zh.ts'

/** th base dictionary for the common namespace, checked complete against the zh key set. */
export const th = {
  'ok': 'ตกลง',
  'cancel': 'ยกเลิก',
  'close': 'ปิด',
  'copy': 'คัดลอก',
  'copied': 'คัดลอกแล้ว',
  'retry': 'ลองใหม่',
  'loading': 'กำลังโหลด…',
  'load.failed': 'โหลดไม่สำเร็จ',
  'submit': 'ส่ง',
  'submitting': 'กำลังส่ง…',
  'next': 'ถัดไป',
  'previous': 'ย้อนกลับ',
  'skip': 'ข้าม',
  'delete': 'ลบ',
  'edit': 'แก้ไข',
  'save': 'บันทึก',
  'search': 'ค้นหา',
  'more': 'เพิ่มเติม',
  'collapse': 'ย่อ',
  'expand': 'ขยาย',
  'back': 'กลับ',
  'unknown': 'ไม่ทราบ',
  'none': 'ไม่มี',
  'truncated': 'ถูกตัดทอน',
} satisfies Record<CommonKey, string>
