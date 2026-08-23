/** 将客户端坐标转为球场归一化坐标 (0-100) */
export function pointInPitch(clientX: number, clientY: number): { x: number; y: number } | null {
  const el = document.querySelector<HTMLElement>('[data-pitch]')
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const x = ((clientX - rect.left) / rect.width) * 100
  const y = ((clientY - rect.top) / rect.height) * 100
  return { x: Math.min(98, Math.max(2, x)), y: Math.min(98, Math.max(2, y)) }
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
): string | null {
  const pitch = document.querySelector<HTMLElement>('[data-pitch]')
  if (!pitch) return null
  const rect = pitch.getBoundingClientRect()
  const px = clientX - rect.left
  const py = clientY - rect.top
  let best: string | null = null
  let bestDist = Infinity
  for (const slot of slots) {
    if (slot.key === excludeId) continue
    const d = Math.hypot((slot.x / 100) * rect.width - px, (slot.y / 100) * rect.height - py)
    if (d < bestDist) {
      bestDist = d
      best = slot.key
    }
  }
  // 阈值 ≈ 球员图标直径，落点贴近另一名球员才视为换位
  return bestDist <= 44 ? best : null
}
