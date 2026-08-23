/** 场上位置（参照真实足球位置体系） */
export type Position =
  | 'GK'
  | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB'
  | 'DM' | 'CM' | 'AM' | 'LM' | 'RM'
  | 'LW' | 'RW' | 'ST'

/** 球员 */
export interface Player {
  id: string
  name: string
  /** 球衣号码 */
  number: number
  /** 偏好位置 */
  preferredPositions: Position[]
}

/** 场上槽位：场上恒为 11 个 */
export interface FieldSlot {
  playerId: string
  /** 归一化坐标 0-100，左 = 本方球门，右 = 对方球门，上 = 0 */
  x: number
  y: number
  /** 当前分配的位置 */
  position: Position
}

/** 阵型 */
export interface Formation {
  id: string
  name: string
  isPreset: boolean
  /** 11 个点位 */
  layout: Array<{ position: Position; x: number; y: number }>
}

/** 对方场上球员（模式 2：仅场上 11 人，无花名册/替补席） */
export interface OppSlot {
  id: string
  /** 球衣号码 */
  number: number
  /** 归一化坐标 0-100 */
  x: number
  y: number
  /** 当前分配的位置 */
  position: Position
}

/** 归一化坐标点 */
export interface XY {
  x: number
  y: number
}

/** 球场显示方向：横屏（默认）/ 竖屏（旋转 90°，适合手机） */
export type PitchOrientation = 'landscape' | 'portrait'

/** 箭头类型：pass 传球（实线）/ run 跑位（虚线） */
export type ArrowType = 'pass' | 'run'

/** 战术箭头 */
export interface ArrowDef {
  id: string
  type: ArrowType
  from: XY
  to: XY
}

/** 高亮区域（归一化矩形） */
export interface ZoneDef {
  id: string
  x: number
  y: number
  w: number
  h: number
  /** 十六进制颜色 */
  color: string
}

/** 文字标注 */
export interface TextDef {
  id: string
  x: number
  y: number
  text: string
}

/** 自由绘制的元素集合 */
export interface CustomElements {
  arrows: ArrowDef[]
  zones: ZoneDef[]
  texts: TextDef[]
}

export type TacticType = 'attack' | 'defense' | 'setpiece' | 'custom'

/** 战术（预设模板 + 自定义） */
export interface Tactic {
  id: string
  name: string
  type: TacticType
  description: string
  isPreset: boolean
  arrows: ArrowDef[]
  zones: ZoneDef[]
  texts: TextDef[]
}

/** 演示关键帧 */
export interface DemoFrame {
  /** 本帧 11 人位置（按 playerId） */
  playerPositions: Array<{ playerId: string; x: number; y: number }>
  /** 足球位置（null 表示无球） */
  ball: XY | null
  /** 本帧显示的箭头 */
  arrows: ArrowDef[]
  /** 本帧说明文字 */
  note?: string
}

/** 战术演示（关键帧序列） */
export interface TacticDemo {
  id: string
  name: string
  isPreset: boolean
  frames: DemoFrame[]
}

/** 方案快照：一整套战术板的完整状态 */
export interface PlanState {
  mode: 'own' | 'both'
  players: Player[]
  field: FieldSlot[]
  bench: string[]
  formationId: string | null
  oppField: OppSlot[]
  oppFormationId: string | null
  customFormations: Formation[]
  customTactics: Tactic[]
  activeTactics: Tactic[]
  customElements: CustomElements
  ball: XY | null
  demoLibrary: TacticDemo[]
  activeDemo: TacticDemo | null
}

/** 保存的战术方案 */
export interface Plan {
  id: string
  name: string
  /** ISO 时间字符串 */
  savedAt: string
  state: PlanState
}
