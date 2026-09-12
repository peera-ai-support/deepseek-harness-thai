/** Locale bundles for the agent-preset hero chip, header label, and management section. */

/** Locale keys these surfaces render. */
export type AgentPresetSettingsKey =
  | 'error' | 'userTrust' | 'seatHint' | 'headerHint'
  | 'nav' | 'sectionIntro' | 'builtIn' | 'setDefault' | 'view'
  | 'presetStandardName' | 'presetStandardDescription'
  | 'presetPtcName' | 'presetPtcDescription'
  | 'presetMinimalName' | 'presetMinimalDescription'
  | 'presetCordisName' | 'presetCordisDescription'
  | 'duplicate' | 'duplicateUnavailable' | 'delete' | 'presetId' | 'presetIdPlaceholder' | 'copyOf'
  | 'displayName' | 'displayNamePlaceholder'
  | 'inUse' | 'noDescription' | 'builtInGroup' | 'customGroup'
  | 'brokenBadge' | 'brokenNoCopy' | 'switchRefused'
  | 'composition' | 'cancel' | 'close' | 'retry'
  | 'copyTitle' | 'copyIntro' | 'create' | 'creating' | 'creatorDraft'
  | 'openLocation' | 'showLocation' | 'revealedPathLabel'
  | 'idRequired' | 'idInvalid' | 'idTaken'
  | 'deleteTitle' | 'deleteDescription' | 'deleteConfirm' | 'deleting'

/** English copy. */
export const en: Record<AgentPresetSettingsKey, string> = {
  error: 'Could not load agent presets.',
  userTrust: 'Custom',
  seatHint: 'Agent preset for the session you are about to start',
  headerHint: 'The agent preset this session runs, fixed when it started',
  nav: 'Agent presets',
  sectionIntro:
    'A preset is the plugin composition one session\'s agent runs — its tools, prompt, and capabilities. '
    + 'Duplicate an existing one and make it yours, or let the agent draft one for you in Creator mode.',
  builtIn: 'Built-in',
  setDefault: 'Set as default',
  view: 'View',
  presetStandardName: 'Standard mode',
  presetStandardDescription:
    'Full coding agent with file editing, shell, file and web search, skills, planning, goals, subagents, and workflows.',
  presetPtcName: 'PTC mode',
  presetPtcDescription:
    'Full coding agent without the workflow tool; other tools are exposed through the PTC mode SDK so the model can combine multi-step operations in one TypeScript program.',
  presetMinimalName: 'Minimal mode',
  presetMinimalDescription:
    'Single-tool coding agent with a persistent shell.',
  presetCordisName: 'Creator mode',
  presetCordisDescription:
    'Built for creating custom agent presets, with all Standard mode capabilities plus runtime inspection, plugin experiments, and preset-authoring guidance.',
  duplicate: 'Duplicate',
  duplicateUnavailable: 'This deployment has no writable preset directory',
  delete: 'Delete',
  presetId: 'Identifier',
  presetIdPlaceholder: 'my-agent',
  displayName: 'Name',
  displayNamePlaceholder: 'Shown in the picker; defaults to the identifier',
  inUse: 'In use',
  builtInGroup: 'Built-in',
  customGroup: 'Custom',
  noDescription: 'No description.',
  brokenBadge: 'Failed to load',
  brokenNoCopy: 'A preset that failed to load cannot be duplicated',
  switchRefused: 'Could not switch to {name}: {reason}',
  copyOf: 'Copied from',
  composition: 'Composition (agent.cordis.yml)',
  cancel: 'Cancel',
  close: 'Close',
  retry: 'Retry',
  copyTitle: 'Duplicate preset',
  copyIntro:
    'The whole preset is copied on this machine. The identifier becomes its directory name and cannot '
    + 'be changed later; everything else is edited in the preset\'s own files.',
  create: 'Create',
  creating: 'Creating…',
  creatorDraft: 'Draft a custom preset with Creator mode',
  openLocation: 'Open folder',
  showLocation: 'Show location',
  revealedPathLabel: 'Preset files:',
  idRequired: 'Give the preset an identifier.',
  idInvalid: 'Use lowercase letters, digits, and hyphens, starting with a letter or digit.',
  idTaken: 'A preset with this identifier already exists.',
  deleteTitle: 'Delete this preset?',
  deleteDescription:
    'The preset directory is deleted. Sessions already running on it keep working; new sessions cannot select it.',
  deleteConfirm: 'Delete',
  deleting: 'Deleting…',
}

/** Simplified Chinese copy. */
export const zh: Record<AgentPresetSettingsKey, string> = {
  error: '无法加载 Agent 预设。',
  userTrust: '自定义',
  seatHint: '即将开始的这个会话所用的 Agent 预设',
  headerHint: '本会话运行的 Agent 预设，开始时即固定',
  nav: 'Agent 预设',
  sectionIntro: '预设即一个会话的 Agent 所运行的插件组装 —— 它的工具、提示词与能力。复制一份既有预设改成自己的，或用「创造模式」让 Agent 帮你创建。',
  builtIn: '内置',
  setDefault: '设为默认',
  view: '查看',
  presetStandardName: '标准模式',
  presetStandardDescription: '功能完整的编码 Agent，支持文件编辑、Shell、文件与网页检索、Skills、计划、目标、子代理和工作流。',
  presetPtcName: 'PTC 模式',
  presetPtcDescription: '功能完整的编码 Agent，但默认不提供 workflow 工具；其他工具通过 PTC 模式 SDK 呈现，让模型用一个 TypeScript 程序组合多步操作。',
  presetMinimalName: '极简模式',
  presetMinimalDescription: '仅提供持久 shell 的单工具编码 Agent。',
  presetCordisName: '创造模式',
  presetCordisDescription: '用于创建自定义 Agent preset：具备标准模式的全部能力，并提供运行时检查、插件实验和 preset 创作指导。',
  duplicate: '复制',
  duplicateUnavailable: '此部署未配置可写的预设目录',
  delete: '删除',
  presetId: '标识符',
  presetIdPlaceholder: 'my-agent',
  displayName: '名称',
  displayNamePlaceholder: '选择器中显示的名字，缺省用标识符',
  inUse: '当前使用',
  builtInGroup: '内置',
  customGroup: '自定义',
  noDescription: '暂无描述。',
  brokenBadge: '加载失败',
  brokenNoCopy: '预设加载失败，不能复制',
  switchRefused: '无法切换到「{name}」：{reason}',
  copyOf: '复制自',
  composition: '组装（agent.cordis.yml）',
  cancel: '取消',
  close: '关闭',
  retry: '重试',
  copyTitle: '复制预设',
  copyIntro: '整个预设会在本机复制一份。标识符将成为目录名，事后无法更改；其余内容之后直接在预设自己的文件里编辑。',
  create: '创建',
  creating: '正在创建…',
  creatorDraft: '用「创造模式」创作自定义预设',
  openLocation: '打开目录',
  showLocation: '查看路径',
  revealedPathLabel: '预设文件：',
  idRequired: '请填写标识符。',
  idInvalid: '只能使用小写字母、数字与连字符，且以字母或数字开头。',
  idTaken: '该标识符已被占用。',
  deleteTitle: '删除该预设？',
  deleteDescription: '预设目录将被删除。已在其上运行的会话不受影响；新会话将无法再选择它。',
  deleteConfirm: '删除',
  deleting: '正在删除…',
}

// The resolution itself is the shared fold in `dsh-agent-presets/display`,
// re-exported here so every surface in this plugin reads one path; the
// Settings plugin list inlines the same fold over this plugin's dictionaries.
export { presetDisplayText } from '@deepseek-ai/dsh-agent-presets/display'
export type { PresetDisplaySource, PresetDisplayText } from '@deepseek-ai/dsh-agent-presets/display'

export const th: Partial<Record<AgentPresetSettingsKey, string>> = {
  error: 'ไม่สามารถโหลดโปรไฟล์เอเจนต์ได้',
  userTrust: 'กำหนดเอง',
  seatHint: 'โปรไฟล์เอเจนต์สำหรับเซสชันที่คุณกำลังจะเริ่ม',
  headerHint: 'โปรไฟล์เอเจนต์ที่เซสชันนี้กำลังใช้งาน ซึ่งถูกกำหนดตั้งแต่เริ่มเซสชัน',
  nav: 'โปรไฟล์เอเจนต์',
  sectionIntro: 'โปรไฟล์คือการประกอบปลั๊กอินที่เอเจนต์ในเซสชันนั้นๆ ใช้งาน — ประกอบด้วยเครื่องมือ ข้อความพรอมต์ และความสามารถต่างๆ '
    + 'คุณสามารถคัดลอกโปรไฟล์ที่มีอยู่เพื่อนำมาปรับแต่งเอง หรือให้เอเจนต์ช่วยสร้างในโหมดผู้สร้าง (Creator mode)',
  builtIn: 'ในตัวระบบ',
  setDefault: 'ตั้งเป็นค่าเริ่มต้น',
  view: 'ดู',
  presetStandardName: 'โหมดมาตรฐาน (Standard)',
  presetStandardDescription: 'เอเจนต์เขียนโค้ดที่สมบูรณ์แบบ รองรับการแก้ไขไฟล์, Shell, การค้นหาไฟล์และเว็บ, Skills, แผนงาน, เป้าหมาย, เอเจนต์ย่อย และเวิร์กโฟลว์',
  presetMinimalName: 'โหมดมินิมอล (Minimal)',
  presetMinimalDescription: 'เอเจนต์เขียนโค้ดแบบกระชับ พร้อมเครื่องมือ 2 ตัว: bash แบบคงอยู่ และ str_replace_editor',
  presetCordisName: 'โหมดผู้สร้าง (Creator mode)',
  presetCordisDescription: 'ออกแบบมาเพื่อสร้างโปรไฟล์เอเจนต์แบบกำหนดเอง มีความสามารถครบตามโหมดมาตรฐาน พร้อมการตรวจสอบ Runtime, ทดลองปลั๊กอิน และคู่มือสร้างโปรไฟล์',
  duplicate: 'คัดลอก',
  duplicateUnavailable: 'การติดตั้งนี้ไม่มีโฟลเดอร์โปรไฟล์ที่สามารถเขียนได้',
  delete: 'ลบ',
  presetId: 'รหัสประจำตัว (ID)',
  presetIdPlaceholder: 'my-agent',
  displayName: 'ชื่อ',
  displayNamePlaceholder: 'แสดงในเมนูเลือก หากเว้นว่างจะใช้รหัสประจำตัว',
  inUse: 'กำลังใช้งาน',
  builtInGroup: 'ในตัวระบบ',
  customGroup: 'กำหนดเอง',
  noDescription: 'ไม่มีคำอธิบาย',
  brokenBadge: 'โหลดไม่สำเร็จ',
  brokenNoCopy: 'โปรไฟล์ที่โหลดไม่สำเร็จจะไม่สามารถคัดลอกได้',
  copyOf: 'คัดลอกจาก',
  composition: 'การประกอบ (agent.cordis.yml)',
  cancel: 'ยกเลิก',
  close: 'ปิด',
  retry: 'ลองใหม่',
  copyTitle: 'คัดลอกโปรไฟล์',
  copyIntro: 'โปรไฟล์ทั้งหมดจะถูกคัดลอกลงในเครื่องนี้ รหัสประจำตัวจะกลายเป็นชื่อโฟลเดอร์และไม่สามารถเปลี่ยนภายหลังได้ '
    + 'ส่วนอื่นๆ สามารถแก้ไขได้ในไฟล์ของโปรไฟล์เอง',
  create: 'สร้าง',
  creating: 'กำลังสร้าง…',
  creatorDraft: 'ร่างโปรไฟล์แบบกำหนดเองด้วยโหมดผู้สร้าง (Creator mode)',
  openLocation: 'เปิดโฟลเดอร์',
  showLocation: 'แสดงที่ตั้ง',
  revealedPathLabel: 'ไฟล์ของโปรไฟล์:',
  idRequired: 'กรุณาระบุรหัสประจำตัวของโปรไฟล์',
  idInvalid: 'ใช้ได้เฉพาะตัวอักษรพิมพ์เล็ก ตัวเลข และเครื่องหมายขีดคั่น (-) โดยต้องขึ้นต้นด้วยตัวอักษรหรือตัวเลข',
  idTaken: 'มีโปรไฟล์ที่ใช้รหัสประจำตัวนี้อยู่แล้ว',
  deleteTitle: 'ลบโปรไฟล์นี้หรือไม่?',
  deleteDescription: 'โฟลเดอร์โปรไฟล์จะถูกลบ เซสชันที่กำลังทำงานอยู่จะยังคงทำงานต่อได้ แต่เซสชันใหม่จะไม่สามารถเลือกโปรไฟล์นี้ได้อีก',
  deleteConfirm: 'ลบ',
  deleting: 'กำลังลบ…',
}
