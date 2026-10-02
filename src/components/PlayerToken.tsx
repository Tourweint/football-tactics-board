import type { Position } from '../types'

interface Props {
  /** 球员/槽位 id（写入 DOM 便于拖拽覆盖命中检测） */
  playerId: string
  name?: string
  number: number
  position: Position
  color: string
  x: number
  y: number
  dragging: boolean
  /** own = 我方（彩色），opp = 对方（灰色） */
  team: 'own' | 'opp'
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
}

/** 场上球员：圆形号码 + 姓名 + 位置标签；颜色恒为该球员的角色配色 */
export default function PlayerToken({
  playerId,
  name,
  number,
  position,
  color,
  x,
  y,
  dragging,
  team,
  onPointerDown,
}: Props) {
  return (
    <div
      className={`player-token${team === 'opp' ? ' opp' : ''}${dragging ? ' dragging' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      data-token-id={playerId}
      title="点击编辑球员"
      onPointerDown={onPointerDown}
    >
      <div className="token-circle" style={{ backgroundColor: color }}>
        {number}
      </div>
      {name !== undefined && <div className="token-name">{name}</div>}
      <div className="token-pos" style={{ color }}>
        {position}
      </div>
    </div>
  )
}
