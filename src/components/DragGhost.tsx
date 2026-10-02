import { useBoardStore } from '../store/boardStore'
import { useDragStore } from '../store/dragStore'
import { POSITION_COLOR } from '../positions'

/** 替补球员拖拽时跟随指针的幽灵图标（含姓名） */
export default function DragGhost() {
  const ghost = useDragStore((s) => s.ghost)
  const players = useBoardStore((s) => s.players)
  if (!ghost) return null
  const player = players.find((p) => p.id === ghost.playerId)
  if (!player) return null

  return (
    <div className="drag-ghost" style={{ left: ghost.x, top: ghost.y }}>
      <div
        className="token-circle ghost-circle"
        style={{ backgroundColor: POSITION_COLOR[player.preferredPositions[0] ?? 'ST'] }}
      >
        {player.number}
      </div>
      <div className="token-name">{player.name}</div>
    </div>
  )
}
