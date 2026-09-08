/** `feedback` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'action.like': '好的回答',
  'action.likeActive': '取消标记',
  'action.dislike': '有问题的回答',
  'action.dislikeActive': '取消标记',
  'note.open': '补充说明',
  'note.dialog': '反馈',
  'note.placeholder': '这条回答哪里好，或哪里有问题？（可选）',
  'note.save': '保存',
  'note.cancel': '取消',
  'note.aria': '反馈说明',
  'error.conflict': '这条反馈已在别处改动，已显示最新状态',
  'error.load': '反馈状态加载失败',
  'error.generic': '反馈保存失败',
} satisfies Record<string, string>

/** The feedback namespace key union. */
export type MessageFeedbackKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The per-message feedback controls' copy. */
    feedback: MessageFeedbackKey
  }
}

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'action.like': 'Good response',
  'action.likeActive': 'Remove rating',
  'action.dislike': 'Bad response',
  'action.dislikeActive': 'Remove rating',
  'note.open': 'Add a note',
  'note.dialog': 'Feedback',
  'note.placeholder': 'What was good, or what went wrong? (optional)',
  'note.save': 'Save',
  'note.cancel': 'Cancel',
  'note.aria': 'Feedback note',
  'error.conflict': 'This feedback changed elsewhere; the latest state is shown',
  'error.load': 'Could not load feedback',
  'error.generic': 'Could not save feedback',
} satisfies Record<MessageFeedbackKey, string>

/** Thai dictionary, checked complete against the shipped key set. */
export const th = {
  'action.like': 'คำตอบที่ดี',
  'action.likeActive': 'ยกเลิกคะแนน',
  'action.dislike': 'คำตอบมีปัญหา',
  'action.dislikeActive': 'ยกเลิกคะแนน',
  'note.open': 'เพิ่มบันทึก',
  'note.dialog': 'ข้อเสนอแนะ',
  'note.placeholder': 'คำตอบนี้ดีอย่างไร หรือมีปัญหาตรงไหน? (ไม่บังคับ)',
  'note.save': 'บันทึก',
  'note.cancel': 'ยกเลิก',
  'note.aria': 'บันทึกความคิดเห็น',
  'error.conflict': 'ความคิดเห็นนี้ถูกแก้ไขจากที่อื่น กำลังแสดงสถานะล่าสุด',
  'error.load': 'โหลดสถานะความคิดเห็นไม่สำเร็จ',
  'error.generic': 'บันทึกความคิดเห็นไม่สำเร็จ',
} satisfies Record<MessageFeedbackKey, string>
