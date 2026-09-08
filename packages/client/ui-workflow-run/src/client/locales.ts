/** `workflowRun` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'workflowRun'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'run.title': '{name}',
  'run.members.one': '{count} 个成员',
  'run.members.other': '{count} 个成员',
  'run.empty': '没有启动成员',
  'phase.unassigned': '未分阶段',
  'phase.empty': '空阶段名',
  'statusCount.running': '运行中 {count}',
  'statusCount.completed': '已完成 {count}',
  'statusCount.failed': '失败 {count}',
  'statusCount.cancelled': '已取消 {count}',
  'statusCount.interrupted': '已中断 {count}',
  'member.empty': '空成员名',
  'member.open': '打开 {name}',
  'status.running': '运行中',
  'status.completed': '已完成',
  'status.failed': '失败',
  'status.cancelled': '已取消',
  'status.interrupted': '已中断',
}

/** English dictionary (same key set). */
export const en: Record<WorkflowRunKey, string> = {
  'run.title': '{name}',
  'run.members.one': '{count} member',
  'run.members.other': '{count} members',
  'run.empty': 'No members started',
  'phase.unassigned': 'Unphased',
  'phase.empty': 'Empty phase name',
  'statusCount.running': 'Running {count}',
  'statusCount.completed': 'Completed {count}',
  'statusCount.failed': 'Failed {count}',
  'statusCount.cancelled': 'Cancelled {count}',
  'statusCount.interrupted': 'Interrupted {count}',
  'member.empty': 'Empty member name',
  'member.open': 'Open {name}',
  'status.running': 'Running',
  'status.completed': 'Completed',
  'status.failed': 'Failed',
  'status.cancelled': 'Cancelled',
  'status.interrupted': 'Interrupted',
}

/** Thai dictionary, checked complete against the shipped key set. */
export const th: Record<WorkflowRunKey, string> = {
  'run.title': '{name}',
  'run.members.one': '{count} สมาชิก',
  'run.members.other': '{count} สมาชิก',
  'run.empty': 'ไม่มีสมาชิกที่เริ่มทำงาน',
  'phase.unassigned': 'ไม่มีเฟส',
  'phase.empty': 'ชื่อเฟสว่าง',
  'statusCount.running': 'กำลังทำงาน {count}',
  'statusCount.completed': 'เสร็จสิ้น {count}',
  'statusCount.failed': 'ล้มเหลว {count}',
  'statusCount.cancelled': 'ยกเลิกแล้ว {count}',
  'statusCount.interrupted': 'ถูกขัดจังหวะ {count}',
  'member.empty': 'ไม่มีชื่อสมาชิก',
  'member.open': 'เปิด {name}',
  'status.running': 'กำลังทำงาน',
  'status.completed': 'เสร็จสิ้น',
  'status.failed': 'ล้มเหลว',
  'status.cancelled': 'ยกเลิกแล้ว',
  'status.interrupted': 'ถูกขัดจังหวะ',
}


/** Union of this namespace's dictionary keys. */
export type WorkflowRunKey = keyof typeof zh
