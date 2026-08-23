import { create } from 'zustand'

/** 界面功能区收起/展开状态（不持久化） */
interface UIState {
  /** 花名册（桌面侧栏 / 移动抽屉） */
  rosterOpen: boolean
  /** 替补席卡片区 */
  benchOpen: boolean
  /** 工具栏第二行（战术/绘制/撤销） */
  toolsOpen: boolean

  toggleRoster: () => void
  toggleBench: () => void
  toggleTools: () => void
  setRosterOpen: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  rosterOpen: true,
  benchOpen: true,
  toolsOpen: true,

  toggleRoster: () => set((s) => ({ rosterOpen: !s.rosterOpen })),
  toggleBench: () => set((s) => ({ benchOpen: !s.benchOpen })),
  toggleTools: () => set((s) => ({ toolsOpen: !s.toolsOpen })),
  setRosterOpen: (v) => set({ rosterOpen: v }),
}))
