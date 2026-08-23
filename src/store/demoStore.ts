import { create } from 'zustand'
import { DEMO_SEG_DURATION } from '../demos'
import { useBoardStore } from './boardStore'

/** 演示面板/播放的 UI 状态（不持久化） */
interface DemoUI {
  /** 演示面板是否打开 */
  demoOpen: boolean
  /** edit = 编排（拖拽球员/足球 + 记录帧）；play = 播放 */
  mode: 'edit' | 'play'
  playing: boolean
  /** 播放中的当前段起点帧 */
  frameIndex: number
  /** 段内进度 0..1 */
  progress: number
  /** 播放倍速 */
  speed: number
  /** 编辑模式下预览的帧（null = 显示实时状态） */
  previewIndex: number | null

  /** 打开演示面板（无演示时自动以当前站位新建） */
  open: () => void
  close: () => void
  enterEdit: () => void
  enterPlay: (from?: number) => void
  play: () => void
  pause: () => void
  goto: (index: number) => void
  stepNext: () => void
  stepPrev: () => void
  setSpeed: (speed: number) => void
  setPreview: (index: number | null) => void
  /** 拖拽手势开始：回到实时编辑状态 */
  clearPreview: () => void
  /** 每帧推进（rAF 驱动） */
  tick: (dt: number) => void
}

export const useDemoStore = create<DemoUI>((set) => ({
  demoOpen: false,
  mode: 'edit',
  playing: false,
  frameIndex: 0,
  progress: 0,
  speed: 1,
  previewIndex: null,

  open: () => {
    const board = useBoardStore.getState()
    if (!board.activeDemo) board.startDemo()
    set({ demoOpen: true, mode: 'edit', playing: false, frameIndex: 0, progress: 0, previewIndex: null })
  },

  close: () =>
    set({
      demoOpen: false,
      mode: 'edit',
      playing: false,
      frameIndex: 0,
      progress: 0,
      previewIndex: null,
    }),

  enterEdit: () => set({ mode: 'edit', playing: false, progress: 0, previewIndex: null }),

  enterPlay: (from) => {
    const demo = useBoardStore.getState().activeDemo
    const last = demo ? Math.max(0, demo.frames.length - 1) : 0
    set({ mode: 'play', playing: true, frameIndex: Math.min(from ?? 0, last), progress: 0 })
  },

  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),

  goto: (index) => {
    const demo = useBoardStore.getState().activeDemo
    const last = demo ? Math.max(0, demo.frames.length - 1) : 0
    set({ frameIndex: Math.max(0, Math.min(index, last)), progress: 0 })
  },

  stepNext: () => {
    const demo = useBoardStore.getState().activeDemo
    const last = demo ? Math.max(0, demo.frames.length - 1) : 0
    set((s) => ({ frameIndex: Math.min(s.frameIndex + 1, last), progress: 0 }))
  },

  stepPrev: () => set((s) => ({ frameIndex: Math.max(0, s.frameIndex - 1), progress: 0 })),

  setSpeed: (speed) => set({ speed }),
  setPreview: (index) => set({ previewIndex: index }),
  clearPreview: () => set((s) => (s.previewIndex === null ? s : { previewIndex: null })),

  tick: (dt) =>
    set((s) => {
      if (!s.playing || s.mode !== 'play') return s
      const demo = useBoardStore.getState().activeDemo
      if (!demo || demo.frames.length < 2) return { ...s, playing: false }
      let { frameIndex, progress } = s
      progress += (dt * s.speed) / DEMO_SEG_DURATION
      while (progress >= 1) {
        if (frameIndex >= demo.frames.length - 2) {
          return { ...s, playing: false, frameIndex: demo.frames.length - 1, progress: 0 }
        }
        progress -= 1
        frameIndex += 1
      }
      return { ...s, frameIndex, progress }
    }),
}))
