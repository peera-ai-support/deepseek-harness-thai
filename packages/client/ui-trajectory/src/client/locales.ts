/** `trajectory` namespace dictionaries (view tab label + toolbar strings). */

/** Dictionary namespace owned by this plugin. */
export const NS = 'trajectory'

/** The trajectory dictionary key set (the source of truth for both locales). */
export type TrajectoryKey =
  | 'view.trajectory'
  | 'toolbar.aria'
  | 'toolbar.duration'
  | 'toolbar.useActualDuration'
  | 'toolbar.useEqualWidth'
  | 'toolbar.actualTime'
  | 'toolbar.turns'
  | 'toolbar.expandTurns'
  | 'toolbar.collapseTurns'
  | 'toolbar.calls'
  | 'toolbar.expandCalls'
  | 'toolbar.collapseCalls'
  | 'toolbar.search'
  | 'toolbar.searchPlaceholder'
  | 'details.openCallAria'
  | 'details.openCall'
  | 'details.openImage'
  | 'details.systemPrompt'
  | 'details.tools'
  | 'details.options'
  | 'details.usage'
  | 'details.timing'
  | 'details.preview'
  | 'details.payload'
  | 'details.result'
  | 'details.schema'
  | 'details.requestTiming'
  | 'details.noPayload'
  | 'details.noResult'
  | 'details.thinking'
  | 'details.eventDetails'
  | 'details.resize'
  | 'details.dragHint'
  | 'details.close'
  | 'timeline.aria'
  | 'timeline.overview'
  | 'timeline.total'
  | 'timeline.started'
  | 'timeline.ttft'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The trajectory view tab label and toolbar strings. */
    'trajectory': TrajectoryKey
  }
}

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh: Record<TrajectoryKey, string> = {
  'view.trajectory': '轨迹',
  'toolbar.aria': '轨迹工具栏',
  'toolbar.duration': 'Duration',
  'toolbar.useActualDuration': 'Use actual duration',
  'toolbar.useEqualWidth': 'Use equal-width operations',
  'toolbar.actualTime': '实际时间',
  'toolbar.turns': 'Turns',
  'toolbar.expandTurns': 'Expand turns',
  'toolbar.collapseTurns': 'Collapse turns',
  'toolbar.calls': 'Calls',
  'toolbar.expandCalls': 'Expand calls',
  'toolbar.collapseCalls': 'Collapse calls',
  'toolbar.search': '搜索轨迹',
  'toolbar.searchPlaceholder': '搜索',
  'details.openCallAria': '打开第 {index} 个块的工具调用摘要',
  'details.openCall': '打开工具调用摘要',
  'details.openImage': '打开图片',
  'details.systemPrompt': '系统提示词',
  'details.tools': '工具',
  'details.options': '选项',
  'details.usage': '用量',
  'details.timing': '耗时',
  'details.preview': '预览',
  'details.payload': '载荷',
  'details.result': '结果',
  'details.schema': '模式',
  'details.requestTiming': '请求时序',
  'details.noPayload': '未捕获载荷',
  'details.noResult': '未捕获结果',
  'details.thinking': '思考',
  'details.eventDetails': '事件详情',
  'details.resize': '调整事件详情大小',
  'details.dragHint': '拖动以调整大小；双击重置。',
  'details.close': '关闭详情',
  'timeline.aria': '轨迹时间线',
  'timeline.overview': '时间线概览；水平拖动以聚焦事件',
  'timeline.total': '总计 {duration}',
  'timeline.started': '始于 {time}',
  'timeline.ttft': 'TTFT {ttft} · 解码 {decoding}',
}

/** English dictionary. */
export const en: Record<TrajectoryKey, string> = {
  'view.trajectory': 'Trajectory',
  'toolbar.aria': 'Trajectory toolbar',
  'toolbar.duration': 'Duration',
  'toolbar.useActualDuration': 'Use actual duration',
  'toolbar.useEqualWidth': 'Use equal-width operations',
  'toolbar.actualTime': 'Actual time',
  'toolbar.turns': 'Turns',
  'toolbar.expandTurns': 'Expand turns',
  'toolbar.collapseTurns': 'Collapse turns',
  'toolbar.calls': 'Calls',
  'toolbar.expandCalls': 'Expand calls',
  'toolbar.collapseCalls': 'Collapse calls',
  'toolbar.search': 'Search trajectory',
  'toolbar.searchPlaceholder': 'Search',
  'details.openCallAria': 'Open Block #{index} tool call summary',
  'details.openCall': 'Open tool call summary',
  'details.openImage': 'Open image',
  'details.systemPrompt': 'System Prompt',
  'details.tools': 'Tools',
  'details.options': 'Options',
  'details.usage': 'Usage',
  'details.timing': 'Timing',
  'details.preview': 'Preview',
  'details.payload': 'Payload',
  'details.result': 'Result',
  'details.schema': 'Schema',
  'details.requestTiming': 'Request Timing',
  'details.noPayload': 'No payload captured',
  'details.noResult': 'No result captured',
  'details.thinking': 'Thinking',
  'details.eventDetails': 'Event details',
  'details.resize': 'Resize event details',
  'details.dragHint': 'Drag to resize. Double-click to reset.',
  'details.close': 'Close details',
  'timeline.aria': 'Trajectory timeline',
  'timeline.overview': 'Timeline overview; drag horizontally to focus events',
  'timeline.total': 'Total {duration}',
  'timeline.started': 'Started {time}',
  'timeline.ttft': 'TTFT {ttft} · Decoding {decoding}',
}

/** Thai dictionary, checked complete against the shipped key set. */
export const th: Record<TrajectoryKey, string> = {
  'view.trajectory': 'เส้นทางการทำงาน (Trajectory)',
  'toolbar.aria': 'แถบเครื่องมือเส้นทางการทำงาน',
  'toolbar.duration': 'ระยะเวลา',
  'toolbar.useActualDuration': 'ใช้ระยะเวลาจริง',
  'toolbar.useEqualWidth': 'ใช้ความกว้างเท่ากันทุกการทำงาน',
  'toolbar.actualTime': 'เวลาตามจริง',
  'toolbar.turns': 'รอบการสนทนา',
  'toolbar.expandTurns': 'ขยายรอบการสนทนา',
  'toolbar.collapseTurns': 'ย่อรอบการสนทนา',
  'toolbar.calls': 'การเรียกเครื่องมือ',
  'toolbar.expandCalls': 'ขยายการเรียกเครื่องมือ',
  'toolbar.collapseCalls': 'ย่อการเรียกเครื่องมือ',
  'toolbar.search': 'ค้นหาเส้นทางการทำงาน',
  'toolbar.searchPlaceholder': 'ค้นหา',
  'details.openCallAria': 'เปิดสรุปการเรียกใช้เครื่องมือของบล็อก #{index}',
  'details.openCall': 'เปิดสรุปการเรียกใช้เครื่องมือ',
  'details.openImage': 'เปิดรูปภาพ',
  'details.systemPrompt': 'พรอมต์ระบบ',
  'details.tools': 'เครื่องมือ',
  'details.options': 'ตัวเลือก',
  'details.usage': 'การใช้งาน',
  'details.timing': 'เวลา',
  'details.preview': 'ตัวอย่าง',
  'details.payload': 'เพย์โหลด',
  'details.result': 'ผลลัพธ์',
  'details.schema': 'โครงสร้าง',
  'details.requestTiming': 'จังหวะเวลาคำขอ',
  'details.noPayload': 'ยังไม่มีการจับเพย์โหลด',
  'details.noResult': 'ยังไม่มีการจับผลลัพธ์',
  'details.thinking': 'คิด',
  'details.eventDetails': 'รายละเอียดอีเวนต์',
  'details.resize': 'ปรับขนาดรายละเอียดอีเวนต์',
  'details.dragHint': 'ลากเพื่อปรับขนาด คลิกสองครั้งเพื่อคืนค่า',
  'details.close': 'ปิดรายละเอียด',
  'timeline.aria': 'ไทม์ไลน์การทำงาน',
  'timeline.overview': 'ภาพรวมไทม์ไลน์; ลากแนวนอนเพื่อโฟกัสอีเวนต์',
  'timeline.total': 'รวม {duration}',
  'timeline.started': 'เริ่ม {time}',
  'timeline.ttft': 'TTFT {ttft} · ถอดรหัส {decoding}',
}
