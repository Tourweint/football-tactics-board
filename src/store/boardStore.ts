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
  CurveDef,
  TacticDemo,
  TextDef,
  XY,
  ZoneDef,
} from '../types'
import { findFormation, mirroredLayout, PRESET_FORMATIONS } from '../formations'
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
  customElements: CustomElements
  demoLibrary: TacticDemo[]
  activeDemo: TacticDemo | null
}

const HISTORY_LIMIT = 50

const emptyCustomElements = (): CustomElements => ({ arrows: [], curves: [], zones: [], texts: [] })

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
  /** 从名单删除球员（场上的直接移除、场上少一人，不自动换人；可撤销） */
  removePlayer: (id: string) => boolean
  /** 我方场上球员移回替补席（场上少一人，可撤销） */
  removeFromField: (playerId: string) => void
  /** 删除对方场上球员（重摆对方阵型可补齐恢复） */
  oppRemoveSlot: (id: string) => void
  /** 移除足球（场上不显示） */
  removeBall: () => void
  /** 把足球放回中圈开球点 */
  restoreBall: () => void
  /** 拖拽我方场上球员实时更新坐标 */
  updateSlot: (playerId: string, x: number, y: number) => void
  /** 落点自动建议位置标签 */
  setSlotPosition: (playerId: string, position: Position) => void
  /** 我方场上两名球员互换位置（仅交换站位坐标，角色/颜色随球员保持） */
  swapSlots: (a: string, b: string) => void
  /** 我方替补球员 → 场上：不足 11 人时直接补位；满 11 人时仅当覆盖到指定场上球员才顶替他 */
  bringOn: (benchPlayerId: string, x: number, y: number, targetPlayerId?: string) => void
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

  /** 添加自定义箭头 */
  addCustomArrow: (a: { type: ArrowDef['type']; from: ArrowDef['from']; to: ArrowDef['to'] }) => void
  /** 添加自定义弧线 */
  addCustomCurve: (c: { from: CurveDef['from']; ctrl: CurveDef['ctrl']; to: CurveDef['to'] }) => void
  /** 添加自定义高亮区域 */
  addCustomZone: (z: { x: number; y: number; w: number; h: number; color: string }) => void
  /** 添加自定义文字标注 */
  addCustomText: (t: { x: number; y: number; text: string }) => void
  /** 删除任意元素（作用于已应用战术实例与自由绘制） */
  removeElement: (id: string) => void
  /** 清空全部手绘标注（箭头/区域/文字，可撤销） */
  clearCustomElements: () => void

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
          // 从名单删除：场上的直接移除（场上少一人，不自动换人），替补的一并移出
          mutate((s) => ({
            players: s.players.filter((p) => p.id !== id),
            field: s.field.filter((slot) => slot.playerId !== id),
            bench: s.bench.filter((bid) => bid !== id),
          }))
          return true
        },

        removeFromField: (playerId) => {
          mutate((s) => ({
            field: s.field.filter((slot) => slot.playerId !== playerId),
            bench: [...s.bench, playerId],
          }))
        },

        oppRemoveSlot: (id) => {
          mutate((s) => ({ oppField: s.oppField.filter((slot) => slot.id !== id) }))
        },

        removeBall: () => set({ ball: null }),

        restoreBall: () => set({ ball: { x: 50, y: 50 } }),

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
            // 仅交换站位坐标；角色（position）随球员保持不变，颜色不因换位改变
            field[ia] = { ...sa, x: sb.x, y: sb.y }
            field[ib] = { ...sb, x: sa.x, y: sa.y }
            return { field }
          })
        },

        bringOn: (benchPlayerId, x, y, targetPlayerId) => {
          const s = get()
          const cx = clamp(x)
          const cy = clamp(y)
          // 场上不足 11 人：直接补位上场，不顶替任何人（位置标签取球员角色）
          if (s.field.length < 11) {
            const rolePos =
              s.players.find((p) => p.id === benchPlayerId)?.preferredPositions[0] ?? 'CM'
            mutate((st) => ({
              field: [...st.field, { playerId: benchPlayerId, x: cx, y: cy, position: rolePos }],
              bench: st.bench.filter((id) => id !== benchPlayerId),
            }))
            return
          }
          // 场上满 11 人：必须覆盖到指定场上球员才顶替（沿用其站位与角色），否则不动
          if (!targetPlayerId) return
          const idx = s.field.findIndex((slot) => slot.playerId === targetPlayerId)
          if (idx < 0) return
          const replaced = s.field[idx]
          const field = [...s.field]
          field[idx] = { ...replaced, playerId: benchPlayerId }
          set({
            field,
            bench: [...s.bench.filter((id) => id !== benchPlayerId), replaced.playerId],
          })
        },

        applyFormation: (formationId) => {
          const formation = findFormation(formationId, get().customFormations)
          if (!formation) return
          mutate((s) => {
            // 场上不足 11 人时从替补席补齐（应用阵型 = 摆满首发）
            const field = [...s.field]
            const bench = [...s.bench]
            while (field.length < 11 && bench.length > 0) {
              field.push({ playerId: bench.shift()!, x: 50, y: 50, position: 'CM' })
            }
            return {
              formationId,
              field: field.map((slot, i) => {
                const layout = formation.layout[i]
                return layout
                  ? { ...slot, x: layout.x, y: layout.y, position: layout.position }
                  : slot
              }),
              bench,
            }
          })
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
            oppField[ia] = { ...sa, x: sb.x, y: sb.y }
            oppField[ib] = { ...sb, x: sa.x, y: sa.y }
            return { oppField }
          })
        },

        oppApplyFormation: (formationId) => {
          const formation = PRESET_FORMATIONS.find((f) => f.id === formationId)
          if (!formation) return
          const layout = mirroredLayout(formation)
          mutate((s) => {
            // 不足 11 人时补齐（恢复此前被删除的对方球员）
            const oppField = [...s.oppField]
            while (oppField.length < 11) {
              const i = oppField.length
              const point = layout[i] ?? layout[layout.length - 1]
              oppField.push({
                id: `opp-${crypto.randomUUID()}`,
                number: i + 1,
                x: point.x,
                y: point.y,
                position: point.position,
              })
            }
            return {
              oppFormationId: formationId,
              oppField: oppField.map((slot, i) => {
                const point = layout[i]
                return point
                  ? { ...slot, x: point.x, y: point.y, position: point.position }
                  : slot
              }),
            }
          })
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

        addCustomCurve: (c) => {
          const el: CurveDef = { id: crypto.randomUUID(), ...c }
          mutate((s) => ({
            customElements: {
              ...s.customElements,
              curves: [...s.customElements.curves, el],
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
            customElements: {
              arrows: s.customElements.arrows.filter((a) => a.id !== id),
              curves: s.customElements.curves.filter((c) => c.id !== id),
              zones: s.customElements.zones.filter((z) => z.id !== id),
              texts: s.customElements.texts.filter((x) => x.id !== id),
            },
          }))
        },

        clearCustomElements: () => {
          mutate(() => ({ customElements: emptyCustomElements() }))
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
          // 方案快照不含共享的演示库（demoLibrary 为全局资源，避免每个方案重复存储）
          const state = {
            mode: s.mode,
            players: s.players,
            field: s.field,
            bench: s.bench,
            formationId: s.formationId,
            oppField: s.oppField,
            oppFormationId: s.oppFormationId,
            customFormations: s.customFormations,
            customElements: s.customElements,
            ball: s.ball,
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
          // 旧方案快照可能携带已移除的战术库字段，载入前剔除（浅拷贝，避免改动已保存的方案对象）
          const legacyState = { ...plan.state } as unknown as Record<string, unknown>
          delete legacyState.customTactics
          delete legacyState.activeTactics
          set({ ...(legacyState as Partial<BoardState>), currentPlanId: id })
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
            customElements: {
              arrows: state.customElements?.arrows ?? [],
              curves: state.customElements?.curves ?? [],
              zones: state.customElements?.zones ?? [],
              texts: state.customElements?.texts ?? [],
            },
            ball: state.ball === undefined ? { x: 50, y: 50 } : state.ball,
            activeDemo: state.activeDemo ?? null,
          }
          // 旧版本导出可能携带已移除的战术库字段，忽略之；演示库为全局资源，不随方案导入
          const legacy = merged as unknown as Record<string, unknown>
          delete legacy.customTactics
          delete legacy.activeTactics
          delete legacy.demoLibrary
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
      version: 2,
      // v1 -> v2：补齐 customElements.curves 字段（旧数据缺省导致黑屏）
      migrate: (persisted) => {
        const s = persisted as Record<string, unknown>
        if (s.customElements && typeof s.customElements === 'object') {
          const ce = s.customElements as Record<string, unknown>
          if (!Array.isArray(ce.curves)) ce.curves = []
        }
        // 旧方案快照里的 customElements 同样补齐
        if (Array.isArray(s.plans)) {
          for (const plan of s.plans as Array<Record<string, unknown>>) {
            const st = plan?.state
            if (st && typeof st === 'object') {
              const ce = (st as Record<string, unknown>).customElements
              if (ce && typeof ce === 'object' && !Array.isArray((ce as Record<string, unknown>).curves)) {
                ;(ce as Record<string, unknown>).curves = []
              }
            }
          }
        }
        return persisted
      },
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
