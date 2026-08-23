import type { Position } from '../types'

interface Props {
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

/** 场上球员：圆形图标 + 球衣号码 + 位置标签 */
export default function PlayerToken({
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
      title="点击编辑球员"
      onPointerDown={onPointerDown}
    >
      <div className="token-circle" style={{ backgroundColor: color }}>
        {number}
      </div>
      <div className="token-pos" style={{ color }}>
        {position}
      </div>
    </div>
  )
}
