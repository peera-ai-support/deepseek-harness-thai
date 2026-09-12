/** `approval` namespace dictionaries. */

/** Simplified Chinese dictionary and key-set source of truth. */
export const zh = {
  waiting: '等待审批',
  'detail.aria': '审批详情',
  escalation: '工具 {toolName} 请求越权执行',
  reject: '拒绝',
  allowOnce: '允许一次',
} satisfies Record<string, string>

/** Approval dictionary key union. */
export type ApprovalKey = keyof typeof zh

/** English dictionary, checked against the Chinese key set. */
export const en = {
  waiting: 'Waiting for approval',
  'detail.aria': 'Approval details',
  escalation: 'Tool {toolName} requests privileged execution',
  reject: 'Reject',
  allowOnce: 'Allow once',
} satisfies Record<ApprovalKey, string>

/** Thai dictionary; untranslated keys fall back to English. */
export const th = {
  waiting: 'รอการอนุมัติ',
  'detail.aria': 'รายละเอียดการอนุมัติ',
  escalation: 'เครื่องมือ {toolName} ขอสิทธิ์ทำงานแบบยกระดับ',
  reject: 'ปฏิเสธ',
  allowOnce: 'อนุญาตครั้งนี้ครั้งเดียว',
} satisfies Partial<Record<ApprovalKey, string>>
