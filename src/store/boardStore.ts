import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ArrowDef,
  CustomElements,
  DemoFrame,
  FieldSlot,
  Formation,
  OppSlot,
  PitchOrientation,
  Plan,
  PlanState,
  Player,
  Position,
  Tactic,
  TacticDemo,
  TextDef,
  XY,
  ZoneDef,
} from '../types'
import {
  findFormation,
  mirroredLayout,
  PRESET_FORMATIONS,
  suggestPosition,
} from '../formations'
import { cloneDemo, PRESET_DEMOS } from '../demos'

/** 默认球队：11 名首发 + 7 名替补 */
function seedPlayers(): Player[] {
  const rows: Array<[number, Position[]]> = [
    [1, ['GK']],
    [2, ['LB']], [3, ['CB']], [4, ['CB']], [5, ['RB']],
    [6, ['DM']], [7, ['CM']], [8, ['CM']],
    [9, ['LW']], [10, ['ST']], [11, ['RW']],
    [12, ['GK']], [13, ['CB']], [14, ['CM']], [15, ['ST']],
    [16, ['RM']], [17, ['LW']], [18, ['RB']],
  ]
  return rows.map(([number, preferredPositions]) => ({
    id: `seed-${number}`,
    name: `球员${String(number).padStart(2, '0')}`,
    number,
    preferredPositions,
  }))
}

/** 默认首发：4-3-3 阵型 */
function seedField(): FieldSlot[] {
  const formation = PRESET_FORMATIONS.find((f) => f.id === '4-3-3')!
  return formation.layout.map((slot, i) => ({ playerId: `seed-${i + 1}`, ...slot }))
}

/** 默认对方场上 11 人：4-4-2 阵型（镜像摆位，对方球门在右） */
function seedOppField(): OppSlot[] {
  const formation = PRESET_FORMATIONS.find((f) => f.id === '4-4-2')!
  return mirroredLayout(formation).map((slot, i) => ({
    id: `opp-${i + 1}`,
    number: i + 1,
    x: slot.x,
    y: slot.y,
    position: slot.position,
  }))
}

const DEFAULT_PLAYERS = seedPlayers()

/** 坐标限制在球场内，留出球员图标边距 */
const clamp = (v: number) => Math.min(98, Math.max(2, v))

/** 展示模式：模式 1 仅我方；模式 2 双方同场对位 */
export type BoardMode = 'own' | 'both'

/** 撤销/重做快照（不含方案列表，方案操作不入历史；足球不入历史） */
type BoardSnapshot = {
  mode: BoardMode
  players: Player[]
  field: FieldSlot[]
  bench: string[]
  formationId: string | null
  customFormations: Formation[]
  oppField: OppSlot[]
  oppFormationId: string | null
  customTactics: Tactic[]
  activeTactics: Tactic[]
  customElements: CustomElements
  demoLibrary: TacticDemo[]
  activeDemo: TacticDemo | null
}

const HISTORY_LIMIT = 50

const emptyCustomElements = (): CustomElements => ({ arrows: [], zones: [], texts: [] })

/** 深拷贝战术（应用时生成独立实例，元素 id 全部刷新） */
function cloneTactic(t: Tactic): Tactic {
  return {
    ...t,
    id: `tactic-${crypto.randomUUID()}`,
    arrows: t.arrows.map((a) => ({ ...a, id: crypto.randomUUID() })),
    zones: t.zones.map((z) => ({ ...z, id: crypto.randomUUID() })),
    texts: t.texts.map((x) => ({ ...x, id: crypto.randomUUID() })),
  }
}

interface BoardState {
  /** 展示模式 */
  mode: BoardMode
  /** 球场显示方向（视图偏好，不入撤销历史/方案快照） */
  pitchOrientation: PitchOrientation
  /** 我方全部球员（花名册） */
  players: Player[]
  /** 我方场上 11 个槽位 */
  field: FieldSlot[]
  /** 我方替补席 playerId 列表（不限人数） */
  bench: string[]
  /** 我方当前应用的阵型（预设或自定义） */
  formationId: string | null
  /** 自定义阵型库 */
  customFormations: Formation[]
  /** 对方场上 11 人（仅场上，无花名册/替补席） */
  oppField: OppSlot[]
  /** 对方当前应用的预设阵型（镜像摆位） */
  oppFormationId: string | null
  /** 自定义战术库 */
  customTactics: Tactic[]
  /** 已应用的战术实例 */
  activeTactics: Tactic[]
  /** 自由绘制的元素 */
  customElements: CustomElements
  /** 足球位置（演示模式使用，null = 无球） */
  ball: XY | null
  /** 自定义演示库 */
  demoLibrary: TacticDemo[]
  /** 当前正在编排/播放的演示 */
  activeDemo: TacticDemo | null
  /** 保存的方案列表 */
  plans: Plan[]
  /** 当前加载的方案 id（null = 未关联方案的草稿） */
  currentPlanId: string | null
  /** 撤销历史（不持久化） */
  _past: BoardSnapshot[]
  /** 重做历史（不持久化） */
  _future: BoardSnapshot[]

  setMode: (mode: BoardMode) => void
  /** 切换球场显示方向（横屏/竖屏） */
  setPitchOrientation: (orientation: PitchOrientation) => void
  /** 撤销一步 */
  undo: () => void
  /** 重做一步 */
  redo: () => void
  /** 拖拽手势开始：记录一次历史快照（整个手势算一步） */
  beginGesture: () => void

  addPlayer: (name: string, number: number, preferredPositions: Position[]) => void
  /** 编辑我方球员（姓名/号码/位置）；fieldPosition 用于同时修改场上站位标签 */
  editPlayer: (
    id: string,
    patch: { name: string; number: number; preferredPositions: Position[]; fieldPosition?: Position },
  ) => void
  /** 删除我方球员；场上球员删除时替补第一人自动顶上，替补席无人则删除失败返回 false */
  removePlayer: (id: string) => boolean
  /** 拖拽我方场上球员实时更新坐标 */
  updateSlot: (playerId: string, x: number, y: number) => void
  /** 落点自动建议位置标签 */
  setSlotPosition: (playerId: string, position: Position) => void
  /** 我方场上两名球员互换位置（坐标与位置标签一起交换） */
  swapSlots: (a: string, b: string) => void
  /** 我方场上球员 → 替补席：与替补席第一人互换（替补席无人则不动） */
  sendToBench: (fieldPlayerId: string) => void
  /** 我方替补球员 → 场上：与离落点最近的场上球员互换，位置按落点自动建议 */
  bringOn: (benchPlayerId: string, x: number, y: number) => void
  /** 我方按阵型摆位（保持现有场上球员顺序） */
  applyFormation: (formationId: string) => void
  /** 把当前场上站位保存为自定义阵型 */
  saveCustomFormation: (name: string) => void
  /** 删除自定义阵型 */
  deleteCustomFormation: (id: string) => void

  /** 编辑对方球员（号码/位置） */
  oppEditPlayer: (id: string, patch: { number: number; position: Position }) => void
  /** 拖拽对方场上球员实时更新坐标 */
  oppUpdateSlot: (id: string, x: number, y: number) => void
  /** 对方落点自动建议位置标签 */
  oppSetSlotPosition: (id: string, position: Position) => void
  /** 对方场上两名球员互换位置 */
  oppSwapSlots: (a: string, b: string) => void
  /** 对方按预设阵型摆位（镜像） */
  oppApplyFormation: (formationId: string) => void

  /** 应用战术（预设或自定义），生成独立实例叠加到画布 */
  applyTactic: (tacticId: string) => void
  /** 移除已应用的战术实例 */
  removeTactic: (instanceId: string) => void
  /** 添加自定义箭头 */
  addCustomArrow: (a: { type: ArrowDef['type']; from: ArrowDef['from']; to: ArrowDef['to'] }) => void
  /** 添加自定义高亮区域 */
  addCustomZone: (z: { x: number; y: number; w: number; h: number; color: string }) => void
  /** 添加自定义文字标注 */
  addCustomText: (t: { x: number; y: number; text: string }) => void
  /** 删除任意元素（作用于已应用战术实例与自由绘制） */
  removeElement: (id: string) => void
  /** 把自由绘制的元素保存为自定义战术 */
  saveCustomTactic: (name: string) => void
  /** 清空全部已应用战术与自由绘制 */
  clearCustomTactics: () => void

  /** 移动足球（演示编排） */
  setBall: (x: number, y: number) => void
  /** 新建演示：以当前站位为第 1 帧 */
  startDemo: () => void
  /** 应用演示模板（预设或自定义） */
  applyDemoPreset: (demoId: string) => void
  /** 把当前站位/足球/绘制箭头记录为新的关键帧 */
  recordFrame: () => void
  /** 删除第 index 帧 */
  deleteFrame: (index: number) => void
  /** 修改第 index 帧的说明文字 */
  updateFrameNote: (index: number, note: string) => void
  /** 把当前演示保存到演示库 */
  saveDemoToLibrary: (name: string) => void
  /** 关闭当前演示 */
  closeDemo: () => void

  /** 保存方案：已有 currentPlanId 则覆盖，否则新建 */
  savePlan: (name: string) => void
  /** 加载方案：整体替换战术板状态 */
  loadPlan: (id: string) => void
  /** 删除方案（不影响当前战术板） */
  deletePlan: (id: string) => void
  /** 新建方案：重置为默认状态 */
  newPlan: () => void
  /** 从 JSON 导入方案：补全缺失字段并载入 */
  importPlan: (name: string, state: PlanState) => void
}

/** 足球默认位置：中圈开球点 */
const DEFAULT_BALL: XY = { x: 50, y: 50 }

/** 重置为默认的初始状态 */
function defaultState() {
  return {
    mode: 'own' as BoardMode,
    pitchOrientation: 'landscape' as PitchOrientation,
    players: DEFAULT_PLAYERS,
    field: seedField(),
    bench: DEFAULT_PLAYERS.slice(11).map((p) => p.id),
    formationId: '4-3-3',
    oppField: seedOppField(),
    oppFormationId: '4-4-2',
    ball: DEFAULT_BALL,
  }
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => {
      const snapshotOf = (s: BoardState): BoardSnapshot => ({
        mode: s.mode,
        players: s.players,
        field: s.field,
        bench: s.bench,
        formationId: s.formationId,
        customFormations: s.customFormations,
        oppField: s.oppField,
        oppFormationId: s.oppFormationId,
        customTactics: s.customTactics,
        activeTactics: s.activeTactics,
        customElements: s.customElements,
        demoLibrary: s.demoLibrary,
        activeDemo: s.activeDemo,
      })

      /** 历史入栈（与前一步相同则跳过，避免空操作产生无效撤销步） */
      const pushPast = (s: BoardState): BoardSnapshot[] => {
        const snap = snapshotOf(s)
        const last = s._past[s._past.length - 1]
        if (last && JSON.stringify(last) === JSON.stringify(snap)) return s._past
        return [...s._past.slice(-(HISTORY_LIMIT - 1)), snap]
      }

      /** 离散操作：变更状态并记录一次历史 */
      const mutate = (patch: (s: BoardState) => Partial<BoardState>) =>
        set((s) => ({ ...patch(s), _past: pushPast(s), _future: [] }))

      return {
        ...defaultState(),
        customFormations: [],
        customTactics: [],
        activeTactics: [],
        customElements: emptyCustomElements(),
        demoLibrary: [],
        activeDemo: null,
        plans: [],
        currentPlanId: null,
        _past: [],
        _future: [],

        setMode: (mode) => mutate(() => ({ mode })),

      setPitchOrientation: (orientation) => set({ pitchOrientation: orientation }),

        undo: () =>
          set((s) => {
            // 跳过与当前状态相同的无效步
            let past = s._past
            let prev: BoardSnapshot | undefined
            while (past.length) {
              const cand = past[past.length - 1]
              if (JSON.stringify(cand) === JSON.stringify(snapshotOf(s))) {
                past = past.slice(0, -1)
                continue
              }
              prev = cand
              break
            }
            if (!prev) return s
            return {
              ...prev,
              _past: past.slice(0, -1),
              _future: [...s._future, snapshotOf(s)],
            }
          }),

        redo: () =>
          set((s) => {
            const next = s._future[s._future.length - 1]
            if (!next) return s
            return {
              ...next,
              _past: [...s._past, snapshotOf(s)],
              _future: s._future.slice(0, -1),
            }
          }),

        beginGesture: () =>
          set((s) => ({ _past: pushPast(s), _future: [] })),

        addPlayer: (name, number, preferredPositions) => {
          const player: Player = { id: crypto.randomUUID(), name, number, preferredPositions }
          mutate((s) => ({ players: [...s.players, player], bench: [...s.bench, player.id] }))
        },

        editPlayer: (id, patch) => {
          mutate((s) => ({
            players: s.players.map((p) =>
              p.id === id
                ? {
                    ...p,
                    name: patch.name,
                    number: patch.number,
                    preferredPositions: patch.preferredPositions,
                  }
                : p,
            ),
            field:
              patch.fieldPosition !== undefined
                ? s.field.map((slot) =>
                    slot.playerId === id ? { ...slot, position: patch.fieldPosition! } : slot,
                  )
                : s.field,
          }))
        },

        removePlayer: (id) => {
          const s = get()
          const slotIdx = s.field.findIndex((slot) => slot.playerId === id)
          if (slotIdx >= 0) {
            // 场上球员：替补第一人自动顶上；替补席无人则不允许删除
            if (s.bench.length === 0) return false
            mutate((st) => {
              const field = [...st.field]
              field[slotIdx] = { ...field[slotIdx], playerId: st.bench[0] }
              return {
                players: st.players.filter((p) => p.id !== id),
                field,
                bench: st.bench.slice(1),
              }
            })
          } else {
            mutate((st) => ({
              players: st.players.filter((p) => p.id !== id),
              bench: st.bench.filter((bid) => bid !== id),
            }))
          }
          return true
        },

        updateSlot: (playerId, x, y) => {
          set((s) => ({
            field: s.field.map((slot) =>
              slot.playerId === playerId ? { ...slot, x: clamp(x), y: clamp(y) } : slot,
            ),
          }))
        },

        setSlotPosition: (playerId, position) => {
          set((s) => ({
            field: s.field.map((slot) =>
              slot.playerId === playerId ? { ...slot, position } : slot,
            ),
          }))
        },

        swapSlots: (a, b) => {
          set((s) => {
            const ia = s.field.findIndex((slot) => slot.playerId === a)
            const ib = s.field.findIndex((slot) => slot.playerId === b)
            if (ia < 0 || ib < 0) return s
            const field = [...s.field]
            const sa = field[ia]
            const sb = field[ib]
            field[ia] = { ...sa, x: sb.x, y: sb.y, position: sb.position }
            field[ib] = { ...sb, x: sa.x, y: sa.y, position: sa.position }
            return { field }
          })
        },

        sendToBench: (fieldPlayerId) => {
          const s = get()
          if (s.bench.length === 0) return
          set({
            field: s.field.map((slot) =>
              slot.playerId === fieldPlayerId ? { ...slot, playerId: s.bench[0] } : slot,
            ),
            bench: [...s.bench.slice(1), fieldPlayerId],
          })
        },

        bringOn: (benchPlayerId, x, y) => {
          const s = get()
          const cx = clamp(x)
          const cy = clamp(y)
          let nearestIdx = 0
          let nearestDist = Infinity
          s.field.forEach((slot, i) => {
            const d = Math.hypot(slot.x - cx, slot.y - cy)
            if (d < nearestDist) {
              nearestDist = d
              nearestIdx = i
            }
          })
          const replaced = s.field[nearestIdx]
          // 位置自动建议：取当前阵型中离落点最近的角色
          const formation = findFormation(s.formationId, s.customFormations)
          const position = formation
            ? suggestPosition(cx, cy, formation.layout)
            : replaced.position
          const field = [...s.field]
          field[nearestIdx] = { playerId: benchPlayerId, x: cx, y: cy, position }
          set({
            field,
            bench: [...s.bench.filter((id) => id !== benchPlayerId), replaced.playerId],
          })
        },

        applyFormation: (formationId) => {
          const formation = findFormation(formationId, get().customFormations)
          if (!formation) return
          mutate((s) => ({
            formationId,
            field: s.field.map((slot, i) => {
              const layout = formation.layout[i]
              return layout
                ? { ...slot, x: layout.x, y: layout.y, position: layout.position }
                : slot
            }),
          }))
        },

        saveCustomFormation: (name) => {
          mutate((s) => {
            const formation: Formation = {
              id: `custom-${crypto.randomUUID()}`,
              name: name || '自定义阵型',
              isPreset: false,
              layout: s.field.map((slot) => ({
                position: slot.position,
                x: slot.x,
                y: slot.y,
              })),
            }
            return {
              customFormations: [...s.customFormations, formation],
              formationId: formation.id,
            }
          })
        },

        deleteCustomFormation: (id) => {
          mutate((s) => ({
            customFormations: s.customFormations.filter((f) => f.id !== id),
            formationId: s.formationId === id ? null : s.formationId,
          }))
        },

        oppEditPlayer: (id, patch) => {
          mutate((s) => ({
            oppField: s.oppField.map((slot) =>
              slot.id === id ? { ...slot, number: patch.number, position: patch.position } : slot,
            ),
          }))
        },

        oppUpdateSlot: (id, x, y) => {
          set((s) => ({
            oppField: s.oppField.map((slot) =>
              slot.id === id ? { ...slot, x: clamp(x), y: clamp(y) } : slot,
            ),
          }))
        },

        oppSetSlotPosition: (id, position) => {
          set((s) => ({
            oppField: s.oppField.map((slot) => (slot.id === id ? { ...slot, position } : slot)),
          }))
        },

        oppSwapSlots: (a, b) => {
          set((s) => {
            const ia = s.oppField.findIndex((slot) => slot.id === a)
            const ib = s.oppField.findIndex((slot) => slot.id === b)
            if (ia < 0 || ib < 0) return s
            const oppField = [...s.oppField]
            const sa = oppField[ia]
            const sb = oppField[ib]
            oppField[ia] = { ...sa, x: sb.x, y: sb.y, position: sb.position }
            oppField[ib] = { ...sb, x: sa.x, y: sa.y, position: sa.position }
            return { oppField }
          })
        },

        oppApplyFormation: (formationId) => {
          const formation = PRESET_FORMATIONS.find((f) => f.id === formationId)
          if (!formation) return
          const layout = mirroredLayout(formation)
          mutate((s) => ({
            oppFormationId: formationId,
            oppField: s.oppField.map((slot, i) => {
              const point = layout[i]
              return point
                ? { ...slot, x: point.x, y: point.y, position: point.position }
                : slot
            }),
          }))
        },

        applyTactic: (tacticId) => {
          const tactic = get().customTactics.find((t) => t.id === tacticId)
          if (!tactic) return
          mutate((s) => ({ activeTactics: [...s.activeTactics, cloneTactic(tactic)] }))
        },

        removeTactic: (instanceId) => {
          mutate((s) => ({
            activeTactics: s.activeTactics.filter((t) => t.id !== instanceId),
          }))
        },

        addCustomArrow: (a) => {
          const el: ArrowDef = { id: crypto.randomUUID(), ...a }
          mutate((s) => ({
            customElements: {
              ...s.customElements,
              arrows: [...s.customElements.arrows, el],
            },
          }))
        },

        addCustomZone: (z) => {
          const el: ZoneDef = { id: crypto.randomUUID(), ...z }
          mutate((s) => ({
            customElements: {
              ...s.customElements,
              zones: [...s.customElements.zones, el],
            },
          }))
        },

        addCustomText: (t) => {
          const el: TextDef = { id: crypto.randomUUID(), ...t }
          mutate((s) => ({
            customElements: {
              ...s.customElements,
              texts: [...s.customElements.texts, el],
            },
          }))
        },

        removeElement: (id) => {
          mutate((s) => ({
            activeTactics: s.activeTactics
              .map((t) => ({
                ...t,
                arrows: t.arrows.filter((a) => a.id !== id),
                zones: t.zones.filter((z) => z.id !== id),
                texts: t.texts.filter((x) => x.id !== id),
              }))
              .filter(
                (t) => t.arrows.length + t.zones.length + t.texts.length > 0,
              ),
            customElements: {
              arrows: s.customElements.arrows.filter((a) => a.id !== id),
              zones: s.customElements.zones.filter((z) => z.id !== id),
              texts: s.customElements.texts.filter((x) => x.id !== id),
            },
          }))
        },

        saveCustomTactic: (name) => {
          mutate((s) => {
            const el = s.customElements
            const tactic: Tactic = {
              id: `custom-tactic-${crypto.randomUUID()}`,
              name,
              type: 'custom',
              description: '自定义战术',
              isPreset: false,
              arrows: el.arrows,
              zones: el.zones,
              texts: el.texts,
            }
            return {
              customTactics: [...s.customTactics, tactic],
              customElements: emptyCustomElements(),
            }
          })
        },

        clearCustomTactics: () => {
          mutate(() => ({ activeTactics: [], customElements: emptyCustomElements() }))
        },

        setBall: (x, y) => set({ ball: { x: clamp(x), y: clamp(y) } }),

        startDemo: () => {
          const s = get()
          if (s.activeDemo) return
          const frame: DemoFrame = {
            playerPositions: s.field.map((slot) => ({
              playerId: slot.playerId,
              x: slot.x,
              y: slot.y,
            })),
            ball: s.ball,
            arrows: s.customElements.arrows.map((a) => ({ ...a })),
          }
          mutate(() => ({
            activeDemo: {
              id: `demo-${crypto.randomUUID()}`,
              name: '新演示',
              isPreset: false,
              frames: [frame],
            },
          }))
        },

        applyDemoPreset: (demoId) => {
          const demo =
            PRESET_DEMOS.find((d) => d.id === demoId) ??
            get().demoLibrary.find((d) => d.id === demoId)
          if (!demo) return
          mutate(() => ({ activeDemo: cloneDemo(demo) }))
        },

        recordFrame: () => {
          const s = get()
          if (!s.activeDemo) return
          const frame: DemoFrame = {
            playerPositions: s.field.map((slot) => ({
              playerId: slot.playerId,
              x: slot.x,
              y: slot.y,
            })),
            ball: s.ball,
            arrows: s.customElements.arrows.map((a) => ({ ...a })),
          }
          mutate((st) => ({
            activeDemo: st.activeDemo
              ? { ...st.activeDemo, frames: [...st.activeDemo.frames, frame] }
              : st.activeDemo,
          }))
        },

        deleteFrame: (index) => {
          mutate((st) => ({
            activeDemo: st.activeDemo
              ? {
                  ...st.activeDemo,
                  frames: st.activeDemo.frames.filter((_, i) => i !== index),
                }
              : st.activeDemo,
          }))
        },

        updateFrameNote: (index, note) => {
          mutate((st) => ({
            activeDemo: st.activeDemo
              ? {
                  ...st.activeDemo,
                  frames: st.activeDemo.frames.map((f, i) =>
                    i === index ? { ...f, note: note || undefined } : f,
                  ),
                }
              : st.activeDemo,
          }))
        },

        saveDemoToLibrary: (name) => {
          const demo = get().activeDemo
          if (!demo) return
          const saved: TacticDemo = { ...demo, id: `demo-${crypto.randomUUID()}`, name, isPreset: false }
          mutate((s) => ({ demoLibrary: [...s.demoLibrary, saved] }))
        },

        closeDemo: () => {
          mutate(() => ({ activeDemo: null }))
        },

        savePlan: (name) => {
          const s = get()
          const state = {
            mode: s.mode,
            players: s.players,
            field: s.field,
            bench: s.bench,
            formationId: s.formationId,
            oppField: s.oppField,
            oppFormationId: s.oppFormationId,
            customFormations: s.customFormations,
            customTactics: s.customTactics,
            activeTactics: s.activeTactics,
            customElements: s.customElements,
            ball: s.ball,
            demoLibrary: s.demoLibrary,
            activeDemo: s.activeDemo,
          }
          if (s.currentPlanId) {
            set({
              plans: s.plans.map((p) =>
                p.id === s.currentPlanId
                  ? { ...p, name, savedAt: new Date().toISOString(), state }
                  : p,
              ),
            })
          } else {
            const plan: Plan = {
              id: `plan-${crypto.randomUUID()}`,
              name,
              savedAt: new Date().toISOString(),
              state,
            }
            set({ plans: [...s.plans, plan], currentPlanId: plan.id })
          }
        },

        loadPlan: (id) => {
          const plan = get().plans.find((p) => p.id === id)
          if (!plan) return
          set({ ...plan.state, currentPlanId: id })
        },

        deletePlan: (id) => {
          set((s) => ({
            plans: s.plans.filter((p) => p.id !== id),
            currentPlanId: s.currentPlanId === id ? null : s.currentPlanId,
          }))
        },

        newPlan: () => {
          set({
            ...defaultState(),
            customFormations: [],
            customTactics: [],
            activeTactics: [],
            customElements: emptyCustomElements(),
            demoLibrary: [],
            activeDemo: null,
            currentPlanId: null,
          })
        },

        importPlan: (name, state) => {
          // 兼容旧版本导出：缺失字段用默认值补全
          const merged: PlanState = {
            ...defaultState(),
            ...state,
            customFormations: state.customFormations ?? [],
            customTactics: state.customTactics ?? [],
            activeTactics: state.activeTactics ?? [],
            customElements: state.customElements ?? { arrows: [], zones: [], texts: [] },
            ball: state.ball ?? { x: 50, y: 50 },
            demoLibrary: state.demoLibrary ?? [],
            activeDemo: state.activeDemo ?? null,
          }
          const plan: Plan = {
            id: `plan-${crypto.randomUUID()}`,
            name,
            savedAt: new Date().toISOString(),
            state: merged,
          }
          set({
            ...merged,
            plans: [...get().plans, plan],
            currentPlanId: plan.id,
          })
        },
      }
    },
    {
      name: 'ftb-board',
      version: 1,
      // 历史栈不持久化
      partialize: (s) => ({
        mode: s.mode,
        pitchOrientation: s.pitchOrientation,
        players: s.players,
        field: s.field,
        bench: s.bench,
        formationId: s.formationId,
        customFormations: s.customFormations,
        oppField: s.oppField,
        oppFormationId: s.oppFormationId,
        customTactics: s.customTactics,
        activeTactics: s.activeTactics,
        customElements: s.customElements,
        ball: s.ball,
        demoLibrary: s.demoLibrary,
        activeDemo: s.activeDemo,
        plans: s.plans,
        currentPlanId: s.currentPlanId,
      }),
    },
  ),
)
