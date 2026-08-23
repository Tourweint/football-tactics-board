import { create } from 'zustand'

/** 球员编辑弹窗状态 */
interface EditState {
  editing: { team: 'own' | 'opp'; playerId: string } | null
  open: (team: 'own' | 'opp', playerId: string) => void
  close: () => void
}

export const useEditStore = create<EditState>((set) => ({
  editing: null,
  open: (team, playerId) => set({ editing: { team, playerId } }),
  close: () => set({ editing: null }),
}))
