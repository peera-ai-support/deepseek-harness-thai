/** Copy dictionaries for the plugin inventory Settings section. */

/** Simplified Chinese dictionary and key source of truth. */
export const zh = {
  tab: '插件列表',
  loading: '正在读取插件…',
  error: '暂时无法读取插件。',
  retry: '重试',
  search: '搜索插件',
  catalog: '插件列表',
  empty: '暂无插件。',
  emptySearch: '没有匹配的插件。',
  enabledTag: '已启用',
  disabledTag: '已停用',
  configuration: '配置状态',
  cordis: 'Cordis 状态',
  unobserved: '未挂载',
  pending: '等待依赖',
  loadingPhase: '加载中',
  active: '已挂载',
  failed: '挂载失败',
  unloading: '卸载中',
} satisfies Record<string, string>

/** Plugin inventory locale key union. */
export type PluginInventoryLocaleKey = keyof typeof zh

/** English dictionary checked against the Chinese key set. */
export const en = {
  tab: 'Plugin list',
  loading: 'Reading plugins…',
  error: 'Plugins are temporarily unavailable.',
  retry: 'Retry',
  search: 'Search plugins',
  catalog: 'Plugin list',
  empty: 'No plugins are available.',
  emptySearch: 'No matching plugins.',
  enabledTag: 'Enabled',
  disabledTag: 'Disabled',
  configuration: 'Configuration',
  cordis: 'Cordis status',
  unobserved: 'Not mounted',
  pending: 'Waiting for dependencies',
  loadingPhase: 'Loading',
  active: 'Mounted',
  failed: 'Mount failed',
  unloading: 'Unloading',
} satisfies Record<PluginInventoryLocaleKey, string>

/** Thai dictionary, checked complete against the shipped key set. */
export const th = {
  tab: 'รายการปลั๊กอิน',
  loading: 'กำลังอ่านปลั๊กอิน…',
  error: 'ไม่สามารถอ่านปลั๊กอินได้ในขณะนี้',
  retry: 'ลองใหม่',
  search: 'ค้นหาปลั๊กอิน',
  catalog: 'รายการปลั๊กอิน',
  empty: 'ไม่มีปลั๊กอินที่พร้อมใช้งาน',
  emptySearch: 'ไม่พบปลั๊กอินที่ตรงกัน',
  enabledTag: 'เปิดใช้งาน',
  disabledTag: 'ปิดใช้งาน',
  configuration: 'สถานะการกำหนดค่า',
  cordis: 'สถานะ Cordis',
  unobserved: 'ยังไม่เมานต์',
  pending: 'กำลังรอการพึ่งพา',
  loadingPhase: 'กำลังโหลด',
  active: 'เมานต์แล้ว',
  failed: 'เมานต์ไม่สำเร็จ',
  unloading: 'กำลังยกเลิกการเมานต์',
} satisfies Record<PluginInventoryLocaleKey, string>
