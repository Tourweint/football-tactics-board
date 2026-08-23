import { useState } from 'react'
import { useBoardStore } from '../store/boardStore'
import { useDragStore } from '../store/dragStore'
import { useEditStore } from '../store/editStore'
import { useDemoStore } from '../store/demoStore'
import { useToolStore, type Draft } from '../store/toolStore'
import { nearestFieldSlot, pointInPitch, pointInZone, toDisplay } from '../drag'
import { hitArrow, hitText, hitZone } from '../draw'
import { demoFrameState } from '../demos'
import { findFormation, mirroredLayout, suggestPosition } from '../formations'
import { POSITION_COLOR } from '../positions'
import type {
  ArrowDef,
  FieldSlot,
  TextDef,
  XY,
  ZoneDef,
} from '../types'
import PlayerToken from './PlayerToken'
import NameModal from './NameModal'
import DemoPanel from './DemoPanel'

/** 对方球员统一灰色 */
const OPP_COLOR = '#64748b'
/** 移动距离小于该像素值视为点击（打开编辑），否则视为拖拽 */
const CLICK_THRESHOLD = 5

/** 经典足球图标（白球 + 黑色五边形花纹） */
function SoccerBall() {
  return (
    <svg viewBox="0 0 40 40" className="ball-svg">
      <defs>
        <clipPath id="ball-clip">
          <circle cx="20" cy="20" r="19" />
        </clipPath>
      </defs>
      <g clipPath="url(#ball-clip)">
        <circle cx="20" cy="20" r="19" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
        {/* 五边形之间的缝线 */}
        <g stroke="#0f172a" strokeWidth="1.2">
          <line x1="20" y1="13" x2="20" y2="4.5" />
          <line x1="26.66" y1="17.84" x2="34.74" y2="15.21" />
          <line x1="24.11" y1="25.66" x2="29.1" y2="32.54" />
          <line x1="15.89" y1="25.66" x2="10.9" y2="32.54" />
          <line x1="13.34" y1="17.84" x2="5.26" y2="15.21" />
        </g>
        {/* 中心五边形 */}
        <polygon points="20,13 26.66,17.84 24.11,25.66 15.89,25.66 13.34,17.84" fill="#0f172a" />
        {/* 边缘五边形（被球体裁切，露出半个） */}
        <polygon points="20,-2.5 26.66,2.34 24.11,10.16 15.89,10.16 13.34,2.34" fill="#0f172a" />
        <polygon points="34.74,8.21 41.4,13.05 38.85,20.87 30.63,20.87 28.08,13.05" fill="#0f172a" />
        <polygon points="29.1,25.54 35.76,30.38 33.21,38.2 24.99,38.2 22.44,30.38" fill="#0f172a" />
        <polygon points="10.9,25.54 17.56,30.38 15.01,38.2 6.79,38.2 4.24,30.38" fill="#0f172a" />
        <polygon points="5.26,8.21 11.92,13.05 9.37,20.87 1.15,20.87 -1.4,13.05" fill="#0f172a" />
      </g>
    </svg>
  )
}

const LINE = { fill: 'none', stroke: 'rgba(255,255,255,0.9)', strokeWidth: 0.7 }
const DOT = { fill: 'rgba(255,255,255,0.9)' }

/** 横屏球场标线（105m × 68m 俯视图，本方球门在左） */
function LandscapeMarkings() {
  return (
    <svg className="pitch-lines" viewBox="0 0 105 68" preserveAspectRatio="none">
      <rect x="0.5" y="0.5" width="104" height="67" {...LINE} />
      <line x1="52.5" y1="0.5" x2="52.5" y2="67.5" {...LINE} />
      <circle cx="52.5" cy="34" r="9.15" {...LINE} />
      <circle cx="52.5" cy="34" r="0.8" {...DOT} />
      <rect x="0.5" y="13.84" width="16" height="40.32" {...LINE} />
      <rect x="0.5" y="24.84" width="5" height="18.32" {...LINE} />
      <circle cx="11" cy="34" r="0.8" {...DOT} />
      <path d="M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31" {...LINE} />
      <rect x="88.5" y="13.84" width="16" height="40.32" {...LINE} />
      <rect x="99.5" y="24.84" width="5" height="18.32" {...LINE} />
      <circle cx="94" cy="34" r="0.8" {...DOT} />
      <path d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31" {...LINE} />
      <path d="M 0.5 1.5 A 1 1 0 0 1 1.5 0.5" {...LINE} />
      <path d="M 103.5 0.5 A 1 1 0 0 1 104.5 1.5" {...LINE} />
      <path d="M 1.5 67.5 A 1 1 0 0 1 0.5 66.5" {...LINE} />
      <path d="M 104.5 66.5 A 1 1 0 0 1 103.5 67.5" {...LINE} />
      <line x1="0.5" y1="30.34" x2="0.5" y2="37.66" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" />
      <line x1="104.5" y1="30.34" x2="104.5" y2="37.66" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" />
    </svg>
  )
}

/** 竖屏球场标线（旋转 90°，本方球门在下方，向上进攻） */
function PortraitMarkings() {
  return (
    <svg className="pitch-lines" viewBox="0 0 68 105" preserveAspectRatio="none">
      <rect x="0.5" y="0.5" width="67" height="104" {...LINE} />
      <line x1="0.5" y1="52.5" x2="67.5" y2="52.5" {...LINE} />
      <circle cx="34" cy="52.5" r="9.15" {...LINE} />
      <circle cx="34" cy="52.5" r="0.8" {...DOT} />
      {/* 下方禁区（本方） */}
      <rect x="13.84" y="83.5" width="40.32" height="16" {...LINE} />
      <rect x="24.84" y="94.5" width="18.32" height="5" {...LINE} />
      <circle cx="34" cy="89" r="0.8" {...DOT} />
      <path d="M 26.69 83.5 A 9.15 9.15 0 0 0 41.31 83.5" {...LINE} />
      {/* 上方禁区（对方） */}
      <rect x="13.84" y="0.5" width="40.32" height="16" {...LINE} />
      <rect x="24.84" y="0.5" width="18.32" height="5" {...LINE} />
      <circle cx="34" cy="6" r="0.8" {...DOT} />
      <path d="M 26.69 11.5 A 9.15 9.15 0 0 1 41.31 11.5" {...LINE} />
      {/* 角旗弧 */}
      <path d="M 0.5 1.5 A 1 1 0 0 1 1.5 0.5" {...LINE} />
      <path d="M 66.5 0.5 A 1 1 0 0 1 67.5 1.5" {...LINE} />
      <path d="M 1.5 104.5 A 1 1 0 0 1 0.5 103.5" {...LINE} />
      <path d="M 67.5 103.5 A 1 1 0 0 1 66.5 104.5" {...LINE} />
      {/* 球门 */}
      <line x1="30.34" y1="99.5" x2="37.66" y2="99.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" />
      <line x1="30.34" y1="0.5" x2="37.66" y2="0.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" />
    </svg>
  )
}

/** 战术箭头（含箭头头部） */
function Arrow({ a }: { a: ArrowDef }) {
  const dx = a.to.x - a.from.x
  const dy = a.to.y - a.from.y
  const len = Math.hypot(dx, dy)
  if (len < 0.001) return null
  const ux = dx / len
  const uy = dy / len
  const headLen = 2.6
  const headW = 1.3
  const bx = a.to.x - ux * headLen
  const by = a.to.y - uy * headLen
  const px = -uy
  const py = ux
  const color = a.type === 'pass' ? '#fbbf24' : '#e2e8f0'
  return (
    <g>
      <line
        x1={a.from.x}
        y1={a.from.y}
        x2={bx}
        y2={by}
        stroke={color}
        strokeWidth={1.1}
        strokeDasharray={a.type === 'run' ? '3.5 2.5' : undefined}
        strokeLinecap="round"
      />
      <polygon
        points={`${a.to.x},${a.to.y} ${bx + px * headW},${by + py * headW} ${bx - px * headW},${by - py * headW}`}
        fill={color}
      />
    </g>
  )
}

/** 战术叠加层：高亮区域 + 箭头（SVG），文字标注（HTML）；坐标均为显示坐标 */
function TacticOverlay({
  arrows,
  zones,
  texts,
  draft,
}: {
  arrows: ArrowDef[]
  zones: ZoneDef[]
  texts: TextDef[]
  draft: Draft
}) {
  return (
    <>
      <svg className="pitch-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          {/* 区域内部斜向虚线填充 */}
          <pattern
            id="zone-hatch"
            width="7"
            height="7"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="7"
              stroke="#fbbf24"
              strokeWidth="0.7"
              strokeDasharray="2.5 2.5"
            />
          </pattern>
        </defs>
        {zones.map((z) => (
          <rect
            key={z.id}
            x={z.x}
            y={z.y}
            width={z.w}
            height={z.h}
            fill="url(#zone-hatch)"
            fillOpacity={0.45}
            stroke={z.color}
            strokeOpacity={0.5}
            strokeWidth={0.9}
            strokeDasharray="4 3"
            rx={1}
          />
        ))}
        {arrows.map((a) => (
          <Arrow key={a.id} a={a} />
        ))}
        {draft && draft.kind === 'arrow' && (
          <Arrow a={{ id: 'draft', type: draft.type, from: draft.start, to: draft.cur }} />
        )}
        {draft && draft.kind === 'zone' && (
          <rect
            x={Math.min(draft.start.x, draft.cur.x)}
            y={Math.min(draft.start.y, draft.cur.y)}
            width={Math.abs(draft.cur.x - draft.start.x)}
            height={Math.abs(draft.cur.y - draft.start.y)}
            fill="url(#zone-hatch)"
            fillOpacity={0.45}
            stroke="#fbbf24"
            strokeOpacity={0.5}
            strokeWidth={0.9}
            strokeDasharray="4 3"
          />
        )}
      </svg>
      {texts.map((t) => (
        <div key={t.id} className="pitch-text" style={{ left: `${t.x}%`, top: `${t.y}%` }}>
          {t.text}
        </div>
      ))}
    </>
  )
}

export default function Pitch() {
  const field = useBoardStore((s) => s.field)
  const players = useBoardStore((s) => s.players)
  const mode = useBoardStore((s) => s.mode)
  const oppField = useBoardStore((s) => s.oppField)
  const activeTactics = useBoardStore((s) => s.activeTactics)
  const customElements = useBoardStore((s) => s.customElements)
  const ball = useBoardStore((s) => s.ball)
  const activeDemo = useBoardStore((s) => s.activeDemo)
  const orientation = useBoardStore((s) => s.pitchOrientation)
  const draggingId = useDragStore((s) => s.draggingId)
  const tool = useToolStore((s) => s.tool)
  const draft = useToolStore((s) => s.draft)
  const setDraft = useToolStore((s) => s.setDraft)
  const demoOpen = useDemoStore((s) => s.demoOpen)
  const demoMode = useDemoStore((s) => s.mode)
  const demoFrameIndex = useDemoStore((s) => s.frameIndex)
  const demoProgress = useDemoStore((s) => s.progress)
  const previewIndex = useDemoStore((s) => s.previewIndex)
  const [textPoint, setTextPoint] = useState<XY | null>(null)

  /** 数据坐标 → 显示坐标 */
  const disp = (p: XY): XY => toDisplay(p, orientation)
  const mapArrow = (a: ArrowDef): ArrowDef => ({ ...a, from: disp(a.from), to: disp(a.to) })
  const mapZone = (z: ZoneDef): ZoneDef => {
    const tl = disp({ x: z.x, y: z.y })
    const br = disp({ x: z.x + z.w, y: z.y + z.h })
    return {
      ...z,
      x: Math.min(tl.x, br.x),
      y: Math.min(tl.y, br.y),
      w: Math.abs(br.x - tl.x),
      h: Math.abs(br.y - tl.y),
    }
  }
  const mapText = (t: TextDef): TextDef => ({ ...t, ...disp(t) })

  /** 演示视图：播放中或预览帧时覆盖实时状态（数据坐标） */
  let demoView: {
    positions: Map<string, XY>
    ball: XY | null
    arrows: ArrowDef[]
    note?: string
  } | null = null
  if (demoOpen && activeDemo && activeDemo.frames.length > 0) {
    if (demoMode === 'play') {
      demoView = demoFrameState(activeDemo, demoFrameIndex, demoProgress)
    } else if (previewIndex !== null) {
      demoView = demoFrameState(activeDemo, previewIndex, 0)
    }
  }

  const overlayArrows = (demoView
    ? demoView.arrows
    : [...activeTactics.flatMap((t) => t.arrows), ...customElements.arrows]
  ).map(mapArrow)
  const overlayZones = [
    ...activeTactics.flatMap((t) => t.zones),
    ...customElements.zones,
  ].map(mapZone)
  const overlayTexts = [
    ...activeTactics.flatMap((t) => t.texts),
    ...customElements.texts,
  ].map(mapText)
  const draftMapped = draft
    ? { ...draft, start: disp(draft.start), cur: disp(draft.cur) }
    : null
  // 足球常驻球场：演示视图用帧内球位，否则用实时位置（老数据没有则为中圈开球点）
  const shownBallData = demoView ? demoView.ball : (ball ?? { x: 50, y: 50 })
  const shownBall = shownBallData ? disp(shownBallData) : null
  const slotPos = (slot: FieldSlot): XY => {
    const data = demoView?.positions.get(slot.playerId) ?? slot
    return disp(data)
  }

  /** 橡皮擦：删除命中的第一个元素 */
  const eraseAt = (clientX: number, clientY: number) => {
    const pitch = document.querySelector<HTMLElement>('[data-pitch]')
    if (!pitch) return
    const rect = pitch.getBoundingClientRect()
    const s = useBoardStore.getState()
    const entries: Array<{ id: string; hit: boolean }> = []
    const collect = (arrows: ArrowDef[], zones: ZoneDef[], texts: TextDef[]) => {
      for (const a of arrows) {
        entries.push({ id: a.id, hit: hitArrow(clientX, clientY, a, rect, orientation) })
      }
      for (const z of zones) {
        entries.push({ id: z.id, hit: hitZone(clientX, clientY, z, rect, orientation) })
      }
      for (const t of texts) {
        entries.push({ id: t.id, hit: hitText(clientX, clientY, t, rect, orientation) })
      }
    }
    for (const t of s.activeTactics) collect(t.arrows, t.zones, t.texts)
    collect(s.customElements.arrows, s.customElements.zones, s.customElements.texts)
    const hit = entries.find((e) => e.hit)
    if (hit) s.removeElement(hit.id)
  }

  /** 画布背景绘制：箭头 / 区域 / 文字 / 橡皮 */
  const onPitchPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || tool === 'select') return
    if ((e.target as HTMLElement).closest('.player-token')) return
    e.preventDefault()
    const p = pointInPitch(e.clientX, e.clientY, orientation)
    if (!p) return

    if (tool === 'eraser') {
      eraseAt(e.clientX, e.clientY)
      return
    }
    if (tool === 'text') {
      setTextPoint(p)
      return
    }

    const draftKind = tool === 'zone' ? 'zone' : 'arrow'
    const draftType = tool === 'pass' ? 'pass' : 'run'
    setDraft({ kind: draftKind, type: draftType, start: p, cur: p })
    const move = (ev: PointerEvent) => {
      const cp = pointInPitch(ev.clientX, ev.clientY, orientation)
      if (cp) {
        const d = useToolStore.getState().draft
        if (d) useToolStore.getState().setDraft({ ...d, cur: cp })
      }
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      const d = useToolStore.getState().draft
      const cp = pointInPitch(ev.clientX, ev.clientY, orientation) ?? p
      useToolStore.getState().setDraft(null)
      if (!d) return
      if (d.kind === 'arrow') {
        // 长度过短视为误触
        if (Math.hypot(cp.x - d.start.x, cp.y - d.start.y) < 3) return
        useBoardStore.getState().addCustomArrow({ type: d.type, from: d.start, to: cp })
      } else {
        const w = Math.abs(cp.x - d.start.x)
        const h = Math.abs(cp.y - d.start.y)
        if (w * h < 2) return
        useBoardStore.getState().addCustomZone({
          x: Math.min(d.start.x, cp.x),
          y: Math.min(d.start.y, cp.y),
          w,
          h,
          color: '#fbbf24',
        })
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
  }

  /** 足球拖拽（演示播放中不可拖） */
  const onBallPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (useDemoStore.getState().mode === 'play') return
    e.preventDefault()
    useDemoStore.getState().clearPreview()
    const move = (ev: PointerEvent) => {
      const p = pointInPitch(ev.clientX, ev.clientY, orientation)
      if (p) useBoardStore.getState().setBall(p.x, p.y)
    }
    const up = () => window.removeEventListener('pointermove', move)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
  }

  /** 我方球员拖拽：换位 / 换人；原地点击打开编辑 */
  const onFieldPointerDown = (e: React.PointerEvent, playerId: string) => {
    if (e.button !== 0 || tool !== 'select') return
    e.preventDefault()
    useDemoStore.getState().clearPreview()
    const start = { x: e.clientX, y: e.clientY }
    useBoardStore.getState().beginGesture()
    useDragStore.getState().startFieldDrag(playerId)

    const move = (ev: PointerEvent) => {
      const p = pointInPitch(ev.clientX, ev.clientY, orientation)
      if (p) useBoardStore.getState().updateSlot(playerId, p.x, p.y)
      useDragStore.getState().move(pointInZone('[data-bench]', ev.clientX, ev.clientY))
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < CLICK_THRESHOLD) {
        // 原地点击 → 编辑球员
        useDragStore.getState().clear()
        useEditStore.getState().open('own', playerId)
        return
      }
      if (pointInZone('[data-bench]', ev.clientX, ev.clientY)) {
        // 拖到替补席 → 换下，替补席第一人自动顶上
        useBoardStore.getState().sendToBench(playerId)
      } else {
        // 落在另一名我方场上球员身上 → 两人换位
        const other = nearestFieldSlot(
          ev.clientX,
          ev.clientY,
          playerId,
          useBoardStore.getState().field.map((s) => ({ key: s.playerId, x: s.x, y: s.y })),
          orientation,
        )
        if (other) {
          useBoardStore.getState().swapSlots(playerId, other)
        } else {
          // 落点自动建议位置标签（按当前阵型最近角色）
          const board = useBoardStore.getState()
          const formation = findFormation(board.formationId, board.customFormations)
          const p = pointInPitch(ev.clientX, ev.clientY, orientation)
          if (formation && p) {
            board.setSlotPosition(playerId, suggestPosition(p.x, p.y, formation.layout))
          }
        }
      }
      useDragStore.getState().clear()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
  }

  /** 对方球员拖拽：仅场内自由换位；原地点击打开编辑 */
  const onOppPointerDown = (e: React.PointerEvent, oppId: string) => {
    if (e.button !== 0 || tool !== 'select') return
    e.preventDefault()
    useDemoStore.getState().clearPreview()
    const start = { x: e.clientX, y: e.clientY }
    useBoardStore.getState().beginGesture()
    useDragStore.getState().startFieldDrag(oppId)

    const move = (ev: PointerEvent) => {
      const p = pointInPitch(ev.clientX, ev.clientY, orientation)
      if (p) useBoardStore.getState().oppUpdateSlot(oppId, p.x, p.y)
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < CLICK_THRESHOLD) {
        // 原地点击 → 编辑对方球员
        useDragStore.getState().clear()
        useEditStore.getState().open('opp', oppId)
        return
      }
      // 落在另一名对方场上球员身上 → 两人换位
      const other = nearestFieldSlot(
        ev.clientX,
        ev.clientY,
        oppId,
        useBoardStore.getState().oppField.map((s) => ({ key: s.id, x: s.x, y: s.y })),
        orientation,
      )
      if (other) {
        useBoardStore.getState().oppSwapSlots(oppId, other)
      } else {
        // 落点自动建议位置标签（按对方阵型的镜像点位）
        const board = useBoardStore.getState()
        const formation = findFormation(board.oppFormationId, [])
        const p = pointInPitch(ev.clientX, ev.clientY, orientation)
        if (formation && p) {
          board.oppSetSlotPosition(oppId, suggestPosition(p.x, p.y, mirroredLayout(formation)))
        }
      }
      useDragStore.getState().clear()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
  }

  return (
    <div className="pitch-wrap">
      <div
        className={`pitch${orientation === 'portrait' ? ' portrait' : ''}${tool !== 'select' ? ' drawing' : ''}${demoMode === 'play' ? ' demo-playing' : ''}`}
        data-pitch
        onPointerDown={onPitchPointerDown}
      >
        {orientation === 'portrait' ? <PortraitMarkings /> : <LandscapeMarkings />}
        <TacticOverlay arrows={overlayArrows} zones={overlayZones} texts={overlayTexts} draft={draftMapped} />
        {/* 对方球员在下层 */}
        {mode === 'both' &&
          oppField.map((slot) => (
            <PlayerToken
              key={slot.id}
              number={slot.number}
              position={slot.position}
              color={OPP_COLOR}
              x={disp(slot).x}
              y={disp(slot).y}
              team="opp"
              dragging={draggingId === slot.id}
              onPointerDown={(e) => onOppPointerDown(e, slot.id)}
            />
          ))}
        {/* 我方球员在上层 */}
        {field.map((slot) => {
          const player = players.find((p) => p.id === slot.playerId)
          if (!player) return null
          const pos = slotPos(slot)
          return (
            <PlayerToken
              key={slot.playerId}
              number={player.number}
              position={slot.position}
              color={POSITION_COLOR[slot.position]}
              x={pos.x}
              y={pos.y}
              team="own"
              dragging={draggingId === slot.playerId}
              onPointerDown={(e) => onFieldPointerDown(e, slot.playerId)}
            />
          )
        })}
        {/* 足球（常驻球场，可拖拽） */}
        {shownBall && (
          <div
            className="ball"
            style={{ left: `${shownBall.x}%`, top: `${shownBall.y}%` }}
            onPointerDown={onBallPointerDown}
            title="拖拽移动足球"
          >
            <SoccerBall />
          </div>
        )}
        {demoView?.note && <div className="demo-note">{demoView.note}</div>}
        {mode === 'both' && (
          <div className="pitch-legend">
            <span className="legend-dot own" /> 我方
            <span className="legend-dot opp" /> 对方
          </div>
        )}
      </div>

      {demoOpen && <DemoPanel />}

      {textPoint && (
        <NameModal
          title="文字标注"
          initial=""
          placeholder="输入标注文字"
          onSubmit={(text) =>
            useBoardStore
              .getState()
              .addCustomText({ x: textPoint.x, y: textPoint.y, text })
          }
          onClose={() => setTextPoint(null)}
        />
      )}
    </div>
  )
}
