import { useEffect, useState } from 'react'
import { useBoardStore } from '../store/boardStore'
import { useEditStore } from '../store/editStore'
import { POSITION_LABEL } from '../positions'
import type { Position } from '../types'

interface Editing {
  team: 'own' | 'opp'
  playerId: string
}

/** 球员编辑弹窗：我方（姓名/号码/位置）、对方（号码/位置） */
function EditForm({ editing }: { editing: Editing }) {
  const close = useEditStore((s) => s.close)
  const editPlayer = useBoardStore((s) => s.editPlayer)
  const oppEditPlayer = useBoardStore((s) => s.oppEditPlayer)

  const isOwn = editing.team === 'own'
  const player = useBoardStore((s) => s.players.find((p) => p.id === editing.playerId))
  const opp = useBoardStore((s) => s.oppField.find((o) => o.id === editing.playerId))
  const slot = useBoardStore((s) =>
    s.field.find((sl) => sl.playerId === editing.playerId),
  )

  const [name, setName] = useState(player?.name ?? '')
  const [number, setNumber] = useState(String(player?.number ?? opp?.number ?? ''))
  const [position, setPosition] = useState<Position>(
    player ? (slot?.position ?? player.preferredPositions[0] ?? 'ST') : (opp?.position ?? 'ST'),
  )

  const num = parseInt(number, 10)
  // 姓名仅我方必填（对方无姓名字段）
  const valid =
    (isOwn ? name.trim().length > 0 : true) && Number.isFinite(num) && num >= 1 && num <= 999

  /** 队内重号软提示（不阻断保存） */
  const duplicate = useBoardStore((s) =>
    isOwn
      ? s.players.some((p) => p.id !== editing.playerId && p.number === num)
      : s.oppField.some((o) => o.id !== editing.playerId && o.number === num),
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const save = () => {
    if (!valid) return
    if (isOwn && player) {
      editPlayer(player.id, {
        name: name.trim(),
        number: num,
        preferredPositions: [position],
        fieldPosition: slot ? position : undefined,
      })
    } else if (!isOwn && opp) {
      oppEditPlayer(opp.id, { number: num, position })
    }
    close()
  }

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          {isOwn ? '编辑球员' : '编辑对方球员'}
          <span className="modal-sub">{isOwn ? '我方' : '对方'}</span>
        </div>
        <div className="modal-fields">
          {isOwn && (
            <label>
              姓名
              <input
                value={name}
                maxLength={12}
                autoFocus
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          <label>
            号码
            <input
              type="number"
              min={1}
              max={999}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </label>
          <label>
            位置
            <select value={position} onChange={(e) => setPosition(e.target.value as Position)}>
              {Object.entries(POSITION_LABEL).map(([p, label]) => (
                <option key={p} value={p}>
                  {label}（{p}）
                </option>
              ))}
            </select>
          </label>
        </div>
        {duplicate && <div className="modal-warn">⚠ 队内已有球员使用 {num} 号</div>}
        <div className="modal-actions">
          <button className="modal-cancel" onClick={close}>
            取消
          </button>
          <button className="modal-save" disabled={!valid} onClick={save}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EditModal() {
  const editing = useEditStore((s) => s.editing)
  if (!editing) return null
  return <EditForm key={`${editing.team}-${editing.playerId}`} editing={editing} />
}
