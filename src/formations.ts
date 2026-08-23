import type { Formation, Position } from './types'

/** 阵型镜像（旋转 180°）：用于对方摆阵（对方球门在右，位置标签保持其本方视角） */
export function mirroredLayout(formation: Formation): Formation['layout'] {
  return formation.layout.map((slot) => ({ ...slot, x: 100 - slot.x, y: 100 - slot.y }))
}

/** 位置自动建议：取阵型点位中离落点最近的角色 */
export function suggestPosition(x: number, y: number, layout: Formation['layout']): Position {
  let best = layout[0].position
  let bestDist = Infinity
  for (const slot of layout) {
    const d = Math.hypot(slot.x - x, slot.y - y)
    if (d < bestDist) {
      bestDist = d
      best = slot.position
    }
  }
  return best
}

/** 在预设与自定义阵型中查找 */
export function findFormation(
  id: string | null,
  customs: Formation[],
): Formation | undefined {
  if (!id) return undefined
  return PRESET_FORMATIONS.find((f) => f.id === id) ?? customs.find((f) => f.id === id)
}

/** 预设阵型库：坐标均为归一化值（本方球门在左，上方为 0） */
export const PRESET_FORMATIONS: Formation[] = [
  {
    id: '4-3-3',
    name: '4-3-3',
    isPreset: true,
    layout: [
      { position: 'GK', x: 5, y: 50 },
      { position: 'LB', x: 23, y: 10 }, { position: 'CB', x: 18, y: 33 },
      { position: 'CB', x: 18, y: 67 }, { position: 'RB', x: 23, y: 90 },
      { position: 'DM', x: 40, y: 50 },
      { position: 'CM', x: 48, y: 30 }, { position: 'CM', x: 48, y: 70 },
      { position: 'LW', x: 72, y: 15 }, { position: 'ST', x: 78, y: 50 },
      { position: 'RW', x: 72, y: 85 },
    ],
  },
  {
    id: '4-4-2',
    name: '4-4-2',
    isPreset: true,
    layout: [
      { position: 'GK', x: 5, y: 50 },
      { position: 'LB', x: 23, y: 10 }, { position: 'CB', x: 18, y: 33 },
      { position: 'CB', x: 18, y: 67 }, { position: 'RB', x: 23, y: 90 },
      { position: 'LM', x: 47, y: 10 }, { position: 'CM', x: 42, y: 38 },
      { position: 'CM', x: 42, y: 62 }, { position: 'RM', x: 47, y: 90 },
      { position: 'ST', x: 72, y: 38 }, { position: 'ST', x: 72, y: 62 },
    ],
  },
  {
    id: '4-2-3-1',
    name: '4-2-3-1',
    isPreset: true,
    layout: [
      { position: 'GK', x: 5, y: 50 },
      { position: 'LB', x: 23, y: 10 }, { position: 'CB', x: 18, y: 33 },
      { position: 'CB', x: 18, y: 67 }, { position: 'RB', x: 23, y: 90 },
      { position: 'DM', x: 38, y: 38 }, { position: 'DM', x: 38, y: 62 },
      { position: 'LM', x: 55, y: 12 }, { position: 'AM', x: 56, y: 50 },
      { position: 'RM', x: 55, y: 88 },
      { position: 'ST', x: 78, y: 50 },
    ],
  },
  {
    id: '3-5-2',
    name: '3-5-2',
    isPreset: true,
    layout: [
      { position: 'GK', x: 5, y: 50 },
      { position: 'CB', x: 16, y: 30 }, { position: 'CB', x: 12, y: 50 },
      { position: 'CB', x: 16, y: 70 },
      { position: 'LWB', x: 38, y: 10 }, { position: 'DM', x: 35, y: 50 },
      { position: 'RWB', x: 38, y: 90 },
      { position: 'CM', x: 52, y: 32 }, { position: 'CM', x: 52, y: 68 },
      { position: 'ST', x: 74, y: 40 }, { position: 'ST', x: 74, y: 60 },
    ],
  },
  {
    id: '5-3-2',
    name: '5-3-2',
    isPreset: true,
    layout: [
      { position: 'GK', x: 5, y: 50 },
      { position: 'LWB', x: 24, y: 8 }, { position: 'CB', x: 16, y: 30 },
      { position: 'CB', x: 12, y: 50 }, { position: 'CB', x: 16, y: 70 },
      { position: 'RWB', x: 24, y: 92 },
      { position: 'CM', x: 42, y: 32 }, { position: 'DM', x: 40, y: 50 },
      { position: 'CM', x: 42, y: 68 },
      { position: 'ST', x: 72, y: 38 }, { position: 'ST', x: 72, y: 62 },
    ],
  },
  {
    id: '4-5-1',
    name: '4-5-1',
    isPreset: true,
    layout: [
      { position: 'GK', x: 5, y: 50 },
      { position: 'LB', x: 23, y: 10 }, { position: 'CB', x: 18, y: 33 },
      { position: 'CB', x: 18, y: 67 }, { position: 'RB', x: 23, y: 90 },
      { position: 'DM', x: 40, y: 50 },
      { position: 'LM', x: 48, y: 10 }, { position: 'CM', x: 44, y: 35 },
      { position: 'CM', x: 44, y: 65 }, { position: 'RM', x: 48, y: 90 },
      { position: 'ST', x: 76, y: 50 },
    ],
  },
]
