import { useEffect } from 'react'
import { useBoardStore } from './store/boardStore'
import { useUIStore } from './store/uiStore'
import Toolbar from './components/Toolbar'
import RosterPanel from './components/RosterPanel'
import Pitch from './components/Pitch'
import Bench from './components/Bench'
import DragGhost from './components/DragGhost'
import EditModal from './components/EditModal'

export default function App() {
  const rosterOpen = useUIStore((s) => s.rosterOpen)
  const setRosterOpen = useUIStore((s) => s.setRosterOpen)

  // 移动端首次加载：默认竖屏球场 + 收起花名册（桌面保持横屏 + 展开）
  useEffect(() => {
    if (window.matchMedia('(max-width: 860px)').matches) {
      useBoardStore.getState().setPitchOrientation('portrait')
      setRosterOpen(false)
    }
  }, [setRosterOpen])

  // Ctrl+Z / Ctrl+Y（Shift+Z）撤销重做；输入框内不拦截，交给浏览器原生行为
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
        return
      }
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) useBoardStore.getState().redo()
        else useBoardStore.getState().undo()
      } else if (key === 'y') {
        e.preventDefault()
        useBoardStore.getState().redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <Toolbar />
      <div className="main">
        {rosterOpen && <RosterPanel />}
        <Pitch />
      </div>
      <Bench />
      {rosterOpen && <div className="roster-backdrop" onClick={() => setRosterOpen(false)} />}
      <DragGhost />
      <EditModal />
    </div>
  )
}
