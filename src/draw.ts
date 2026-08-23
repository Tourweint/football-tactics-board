import type { ArrowDef, PitchOrientation, TextDef, XY, ZoneDef } from './types'
import { toDisplay } from './drag'

/** 数据坐标 → 屏幕像素 */
function toPx(p: XY, rect: DOMRect, orientation: PitchOrientation): XY {
  const d = toDisplay(p, orientation)
  return { x: rect.left + (d.x / 100) * rect.width, y: rect.top + (d.y / 100) * rect.height }
}

/** 点到线段的距离（像素） */
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** 箭头命中判定（距线段 10px 内） */
export function hitArrow(
  clientX: number,
  clientY: number,
  a: ArrowDef,
  rect: DOMRect,
  orientation: PitchOrientation,
): boolean {
  const s = toPx(a.from, rect, orientation)
  const e = toPx(a.to, rect, orientation)
  return distToSegment(clientX, clientY, s.x, s.y, e.x, e.y) < 10
}

/** 区域命中判定（矩形内） */
export function hitZone(
  clientX: number,
  clientY: number,
  z: ZoneDef,
  rect: DOMRect,
  orientation: PitchOrientation,
): boolean {
  const s = toPx({ x: z.x, y: z.y }, rect, orientation)
  const e = toPx({ x: z.x + z.w, y: z.y + z.h }, rect, orientation)
  return clientX >= s.x && clientX <= e.x && clientY >= s.y && clientY <= e.y
}

/** 文字标注命中判定（距标注点 24px 内） */
export function hitText(
  clientX: number,
  clientY: number,
  t: TextDef,
  rect: DOMRect,
  orientation: PitchOrientation,
): boolean {
  const p = toPx({ x: t.x, y: t.y }, rect, orientation)
  return Math.hypot(clientX - p.x, clientY - p.y) < 24
}
