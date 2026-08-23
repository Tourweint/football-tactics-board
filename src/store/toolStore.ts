import { create } from 'zustand'
import type { ArrowType, XY } from '../types'

/** 画布工具：select 默认移动球员；其余为战术绘制工具 */
export type DrawTool = 'select' | 'pass' | 'run' | 'zone' | 'text' | 'eraser'

/** 绘制中的草稿（箭头/区域的实时预览） */
export type Draft = {
  kind: 'arrow' | 'zone'
  type: ArrowType
  start: XY
  cur: XY
} | null

interface ToolState {
  tool: DrawTool
  draft: Draft
  setTool: (tool: DrawTool) => void
  setDraft: (draft: Draft) => void
}

export const useToolStore = create<ToolState>((set) => ({
  tool: 'select',
  draft: null,
  setTool: (tool) => set({ tool, draft: null }),
  setDraft: (draft) => set({ draft }),
}))
