import { useState } from 'react'

/** 输入名称的小弹窗（保存阵型/方案/战术、文字标注共用） */
export default function NameModal({
  title,
  initial,
  placeholder,
  onSubmit,
  onClose,
}: {
  title: string
  initial: string
  placeholder?: string
  onSubmit: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial)
  const submit = () => {
    if (!name.trim()) return
    onSubmit(name.trim())
    onClose()
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <input
          className="modal-input"
          value={name}
          maxLength={20}
          autoFocus
          placeholder={placeholder}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onClose()
          }}
        />
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>
            取消
          </button>
          <button className="modal-save" disabled={!name.trim()} onClick={submit}>
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
