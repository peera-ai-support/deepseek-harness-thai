/** `question` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'error.incomplete': '请先完成这道问题。',
  'error.unanswered': '请选择一个选项或填写自定义答案。',
  'nav.prev': '上一题',
  'nav.next': '下一题',
  'nav.minimize': '收起问题卡片',
  'nav.maximize': '展开问题卡片',
  'nav.cancel': '放弃整组问题',
  'option.recommended': '推荐',
  'custom.placeholder': '输入你的答案',
  'action.skip': '跳过本题',
  'action.next': '下一题',
  'plan.header': '计划待审',
  'plan.approve': '确认执行',
  'plan.decline': '拒绝',
  'plan.discuss': '去聊天里说',
} satisfies Record<string, string>

/** The question namespace key union. */
export type QuestionKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'error.incomplete': 'Please complete this question first.',
  'error.unanswered': 'Please select an option or enter a custom answer.',
  'nav.prev': 'Previous question',
  'nav.next': 'Next question',
  'nav.minimize': 'Collapse the question card',
  'nav.maximize': 'Expand the question card',
  'nav.cancel': 'Dismiss all questions',
  'option.recommended': 'Recommended',
  'custom.placeholder': 'Type your answer',
  'action.skip': 'Skip this question',
  'action.next': 'Next',
  'plan.header': 'Plan review',
  'plan.approve': 'Approve',
  'plan.decline': 'Refuse',
  'plan.discuss': 'Chat about it',
} satisfies Record<QuestionKey, string>

/** Thai dictionary, checked complete against the shipped key set. */
export const th = {
  'error.incomplete': 'กรุณาตอบคำถามนี้ให้เรียบร้อยก่อน',
  'error.unanswered': 'กรุณาเลือกตัวเลือกหรือกรอกคำตอบของคุณ',
  'nav.prev': 'คำถามก่อนหน้า',
  'nav.next': 'คำถามถัดไป',
  'nav.minimize': 'ย่อการ์ดคำถาม',
  'nav.maximize': 'ขยายการ์ดคำถาม',
  'nav.cancel': 'ยกเลิกชุดคำถามทั้งหมด',
  'option.recommended': 'แนะนำ',
  'custom.placeholder': 'พิมพ์คำตอบของคุณ',
  'action.skip': 'ข้ามคำถามนี้',
  'action.next': 'ถัดไป',
  'plan.header': 'ตรวจสอบแผนงาน',
  'plan.approve': 'อนุมัติ',
  'plan.decline': 'ปฏิเสธ',
  'plan.discuss': 'คุยรายละเอียดในแชท',
} satisfies Record<QuestionKey, string>
