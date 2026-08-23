import { useBoardStore } from '../store/boardStore'
import { useDragStore } from '../store/dragStore'

/** 替补球员拖拽时跟随指针的幽灵图标 */
export default function DragGhost() {
  const ghost = useDragStore((s) => s.ghost)
  const players = useBoardStore((s) => s.players)
  if (!ghost) return null
  const player = players.find((p) => p.id === ghost.playerId)
  if (!player) return null

  return (
    <div className="drag-ghost" style={{ left: ghost.x, top: ghost.y }}>
      <div className="token-circle ghost-circle">{player.number}</div>
    </div>
  )
}
