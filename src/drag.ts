import type { PitchOrientation, XY } from './types'

/** 数据坐标 → 显示坐标（竖屏时球场旋转 90°：本方球门在下方，向上进攻） */
export function toDisplay(p: XY, orientation: PitchOrientation): XY {
  return orientation === 'portrait' ? { x: p.y, y: 100 - p.x } : p
}

/** 显示坐标（0-100 宽高百分比）→ 数据坐标 */
export function fromDisplay(u: number, v: number, orientation: PitchOrientation): XY {
  return orientation === 'portrait' ? { x: 100 - v, y: u } : { x: u, y: v }
}

/** 将客户端坐标转为球场数据坐标 (0-100) */
export function pointInPitch(
  clientX: number,
  clientY: number,
  orientation: PitchOrientation,
): XY | null {
  const el = document.querySelector<HTMLElement>('[data-pitch]')
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const u = ((clientX - rect.left) / rect.width) * 100
  const v = ((clientY - rect.top) / rect.height) * 100
  const p = fromDisplay(u, v, orientation)
  return { x: Math.min(98, Math.max(2, p.x)), y: Math.min(98, Math.max(2, p.y)) }
}

/** 判断客户端坐标是否落在指定区域元素内 */
export function pointInZone(selector: string, clientX: number, clientY: number): boolean {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return false
  const rect = el.getBoundingClientRect()
  return (
    clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  )
}

/** 与落点重叠（像素距离阈值内）的球员 id，用于同队换位判定 */
export function nearestFieldSlot(
  clientX: number,
  clientY: number,
  excludeId: string,
  slots: Array<{ key: string; x: number; y: number }>,
  orientation: PitchOrientation,
): string | null {
  const pitch = document.querySelector<HTMLElement>('[data-pitch]')
  if (!pitch) return null
  const rect = pitch.getBoundingClientRect()
  const u = ((clientX - rect.left) / rect.width) * 100
  const v = ((clientY - rect.top) / rect.height) * 100
  let best: string | null = null
  let bestDist = Infinity
  for (const slot of slots) {
    if (slot.key === excludeId) continue
    const d = toDisplay(slot, orientation)
    const dist = Math.hypot((d.x - u) * (rect.width / 100), (d.y - v) * (rect.height / 100))
    if (dist < bestDist) {
      bestDist = dist
      best = slot.key
    }
  }
  // 阈值 ≈ 球员图标直径，落点贴近另一名球员才视为换位
  return bestDist <= 44 ? best : null
}
