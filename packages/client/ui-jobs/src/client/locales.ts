/** `job` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'job'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'count.live.one': '{count} 个后台任务运行中',
  'count.live.other': '{count} 个后台任务运行中',
  'count.idle.one': '{count} 个后台任务',
  'count.idle.other': '{count} 个后台任务',
  'list.aria': '后台任务',
  'status.running': '运行中',
  'status.stopping': '正在停止',
  'status.completed': '已完成',
  'status.killed': '已取消',
  'status.failed': '已失败',
  'duration.seconds': '{seconds}秒',
  'duration.minutes': '{minutes}分{seconds}秒',
  'duration.hours': '{hours}小时{minutes}分',
  'duration.title.live': '已运行 {duration}',
  'duration.title.done': '耗时 {duration}',
} as const

/** English dictionary, key-identical to the Chinese source of truth. */
export const en: Record<JobKey, string> = {
  'count.live.one': '{count} background job running',
  'count.live.other': '{count} background jobs running',
  'count.idle.one': '{count} background job',
  'count.idle.other': '{count} background jobs',
  'list.aria': 'Background jobs',
  'status.running': 'running',
  'status.stopping': 'stopping',
  'status.completed': 'completed',
  'status.killed': 'cancelled',
  'status.failed': 'failed',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m',
  'duration.title.live': 'Running for {duration}',
  'duration.title.done': 'Took {duration}',
}

/** Thai dictionary, checked complete against the shipped key set. */
export const th: Record<JobKey, string> = {
  'count.live.one': '{count} งานเบื้องหลังกำลังทำงาน',
  'count.live.other': '{count} งานเบื้องหลังกำลังทำงาน',
  'count.idle.one': '{count} งานเบื้องหลัง',
  'count.idle.other': '{count} งานเบื้องหลัง',
  'list.aria': 'งานเบื้องหลัง',
  'status.running': 'กำลังทำงาน',
  'status.stopping': 'กำลังหยุด',
  'status.completed': 'เสร็จสิ้น',
  'status.killed': 'ยกเลิกแล้ว',
  'status.failed': 'ล้มเหลว',
  'duration.seconds': '{seconds}วิ',
  'duration.minutes': '{minutes}นาที {seconds}วิ',
  'duration.hours': '{hours}ชม. {minutes}นาที',
  'duration.title.live': 'ทำงานมาแล้ว {duration}',
  'duration.title.done': 'ใช้เวลา {duration}',
}


/** Key domain of the `job` namespace (zh is the source of truth). */
export type JobKey = keyof typeof zh
