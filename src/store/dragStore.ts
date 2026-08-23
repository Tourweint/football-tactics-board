import { create } from 'zustand'

/** 拖拽过程中的 UI 状态（不持久化） */
interface DragUI {
  /** 正在拖拽的球员 id */
  draggingId: string | null
  /** 拖拽中是否悬停在替补席上方 */
  overBench: boolean
  /** 替补球员拖拽时的跟随指针的幽灵图标 */
  ghost: { playerId: string; x: number; y: number } | null

  startFieldDrag: (playerId: string) => void
  startBenchDrag: (playerId: string, x: number, y: number) => void
  move: (overBench: boolean, ghost?: { playerId: string; x: number; y: number }) => void
  clear: () => void
}

export const useDragStore = create<DragUI>((set) => ({
  draggingId: null,
  overBench: false,
  ghost: null,

  startFieldDrag: (playerId) => set({ draggingId: playerId, overBench: false, ghost: null }),
  startBenchDrag: (playerId, x, y) => set({ draggingId: playerId, ghost: { playerId, x, y } }),
  move: (overBench, ghost) => set({ overBench, ghost }),
  clear: () => set({ draggingId: null, overBench: false, ghost: null }),
}))
