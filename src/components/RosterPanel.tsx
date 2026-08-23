import { useRef, useState } from 'react'
import { useBoardStore } from '../store/boardStore'
import { useEditStore } from '../store/editStore'
import { useUIStore } from '../store/uiStore'
import { POSITION_COLOR, POSITION_GROUPS, POSITION_LABEL } from '../positions'
import type { Position } from '../types'

/** 左侧花名册：按位置分组展示全队，可添加/编辑/删除球员（移动端为抽屉） */
export default function RosterPanel() {
  const players = useBoardStore((s) => s.players)
  const field = useBoardStore((s) => s.field)
  const addPlayer = useBoardStore((s) => s.addPlayer)
  const removePlayer = useBoardStore((s) => s.removePlayer)
  const openEdit = useEditStore((s) => s.open)

  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [pos, setPos] = useState<Position>('ST')
  const [error, setError] = useState('')
  const errorTimer = useRef<number | undefined>(undefined)

  const showError = (msg: string) => {
    setError(msg)
    window.clearTimeout(errorTimer.current)
    errorTimer.current = window.setTimeout(() => setError(''), 2500)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseInt(number, 10)
    if (!name.trim() || !Number.isFinite(n) || n < 1 || n > 999) return
    addPlayer(name.trim(), n, [pos])
    setName('')
    setNumber('')
  }

  const onRemove = (id: string, isStarter: boolean) => {
    const ok = removePlayer(id)
    if (!ok) showError('替补席已空，无法删除场上球员（请先添加替补）')
    else if (isStarter) showError('已删除，替补席第一人自动顶上')
  }

  /** 场上球员按当前站位分组，替补按偏好位置分组 */
  const fieldPosition = new Map(field.map((s) => [s.playerId, s.position]))
  const actualPos = (playerId: string, preferred: Position[]): Position =>
    fieldPosition.get(playerId) ?? preferred[0] ?? 'ST'

  const groups = POSITION_GROUPS.map((group) => ({
    group,
    members: players.filter((p) =>
      group.positions.includes(actualPos(p.id, p.preferredPositions)),
    ),
  })).filter((g) => g.members.length > 0)

  return (
    <aside className="roster">
      <button className="roster-close" onClick={() => useUIStore.getState().setRosterOpen(false)} title="关闭花名册">
        ✕
      </button>
      <h2 className="panel-title">球队花名册</h2>

      <form className="add-player" onSubmit={submit}>
        <input
          placeholder="姓名"
          value={name}
          maxLength={12}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          placeholder="号码"
          min={1}
          max={999}
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <select value={pos} onChange={(e) => setPos(e.target.value as Position)}>
          {Object.entries(POSITION_LABEL).map(([p, label]) => (
            <option key={p} value={p}>
              {label}（{p}）
            </option>
          ))}
        </select>
        <button type="submit">添加到替补席</button>
      </form>

      <div className="roster-count">
        场上 {field.length} 人 · 替补 {players.length - field.length} 人
      </div>

      {error && <div className="roster-error">{error}</div>}

      {groups.map(({ group, members }) => (
        <div className="roster-group" key={group.label}>
          <div className="roster-group-title" style={{ color: group.color }}>
            {group.label} · {members.length} 人
          </div>
          {members.map((p) => {
            const isStarter = fieldPosition.has(p.id)
            const color = POSITION_COLOR[actualPos(p.id, p.preferredPositions)]
            return (
              <div className="roster-row" key={p.id}>
                <span className="roster-num" style={{ backgroundColor: color }}>
                  {p.number}
                </span>
                <span className="roster-name">{p.name}</span>
                <span className={`roster-badge${isStarter ? ' starter' : ''}`}>
                  {isStarter ? '首发' : '替补'}
                </span>
                <span className="roster-actions">
                  <button
                    className="icon-btn"
                    title="编辑球员"
                    onClick={() => openEdit('own', p.id)}
                  >
                    ✏️
                  </button>
                  <button
                    className="icon-btn danger"
                    title={isStarter ? '删除（替补第一人自动顶上）' : '删除球员'}
                    onClick={() => onRemove(p.id, isStarter)}
                  >
                    ×
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </aside>
  )
}
