import { useBoardStore } from '../store/boardStore'
import { useDragStore } from '../store/dragStore'
import { useEditStore } from '../store/editStore'
import { useToolStore } from '../store/toolStore'
import { useUIStore } from '../store/uiStore'
import { pointInPitch, pointInZone } from '../drag'

/** 替补席：不限人数，可拖拽球员上场，可编辑/删除球员 */
export default function Bench() {
  const bench = useBoardStore((s) => s.bench)
  const players = useBoardStore((s) => s.players)
  const removePlayer = useBoardStore((s) => s.removePlayer)
  const overBench = useDragStore((s) => s.overBench)
  const draggingId = useDragStore((s) => s.draggingId)
  const mode = useBoardStore((s) => s.mode)
  const openEdit = useEditStore((s) => s.open)
  const benchOpen = useUIStore((s) => s.benchOpen)
  const toggleBench = useUIStore((s) => s.toggleBench)
  const orientation = useBoardStore((s) => s.pitchOrientation)

  /** 替补球员拖拽：拖到场上换人，拖回替补席取消 */
  const onBenchPointerDown = (e: React.PointerEvent, playerId: string) => {
    if (e.button !== 0) return
    if (useToolStore.getState().tool !== 'select') return
    e.preventDefault()
    useBoardStore.getState().beginGesture()
    useDragStore.getState().startBenchDrag(playerId, e.clientX, e.clientY)

    const move = (ev: PointerEvent) => {
      useDragStore.getState().move(pointInZone('[data-bench]', ev.clientX, ev.clientY), {
        playerId,
        x: ev.clientX,
        y: ev.clientY,
      })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      if (!pointInZone('[data-bench]', ev.clientX, ev.clientY)) {
        const p = pointInPitch(ev.clientX, ev.clientY, orientation)
        if (p) useBoardStore.getState().bringOn(playerId, p.x, p.y)
      }
      useDragStore.getState().clear()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
  }

  return (
    <div className={`bench${overBench ? ' over-bench' : ''}`} data-bench>
      <div className="bench-title">
        <button className="bench-toggle" onClick={toggleBench} title="收起/展开替补席">
          {benchOpen ? '▾' : '▴'}
        </button>
        {mode === 'both' ? '我方替补席' : '替补席'} · {bench.length} 人
        <span className="bench-hint">
          {overBench ? '松开 → 换下（替补席第一人自动顶上）' : '拖拽球员到场上换人'}
        </span>
      </div>
      {benchOpen && (
      <div className="bench-cards">
        {bench.map((id) => {
          const player = players.find((p) => p.id === id)
          if (!player) return null
          const dragging = draggingId === id
          return (
            <div
              key={id}
              className={`bench-card${dragging ? ' dragging' : ''}`}
              onPointerDown={(e) => onBenchPointerDown(e, id)}
              title={`${player.name} · ${player.number}号`}
            >
              <div className="token-circle bench-circle">{player.number}</div>
              <div className="bench-name">{player.name}</div>
              <span className="bench-actions">
                <button
                  className="icon-btn"
                  title="编辑球员"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => openEdit('own', id)}
                >
                  ✏️
                </button>
                <button
                  className="icon-btn danger"
                  title="移除球员"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => removePlayer(id)}
                >
                  ×
                </button>
              </span>
            </div>
          )
        })}
        {bench.length === 0 && <div className="bench-empty">替补席为空，请在左侧花名册添加球员</div>}
      </div>
      )}
    </div>
  )
}
