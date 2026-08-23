import type { Position } from './types'

/** 位置分组：门将 / 后卫 / 中场 / 前锋，用于配色与花名册分组 */
export const POSITION_GROUPS: Array<{
  label: string
  positions: Position[]
  color: string
}> = [
  { label: '门将', positions: ['GK'], color: '#f59e0b' },
  { label: '后卫', positions: ['CB', 'LB', 'RB', 'LWB', 'RWB'], color: '#3b82f6' },
  { label: '中场', positions: ['DM', 'CM', 'AM', 'LM', 'RM'], color: '#22c55e' },
  { label: '前锋', positions: ['LW', 'RW', 'ST'], color: '#ef4444' },
]

/** 位置 → 颜色 */
export const POSITION_COLOR: Record<Position, string> = Object.fromEntries(
  POSITION_GROUPS.flatMap((g) => g.positions.map((p) => [p, g.color])),
) as Record<Position, string>

/** 位置 → 中文名 */
export const POSITION_LABEL: Record<Position, string> = {
  GK: '守门员',
  CB: '中后卫', LB: '左后卫', RB: '右后卫',
  LWB: '左翼卫', RWB: '右翼卫',
  DM: '后腰', CM: '中前卫', AM: '前腰',
  LM: '左前卫', RM: '右前卫',
  LW: '左边锋', RW: '右边锋', ST: '中锋',
}
