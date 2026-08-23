import { useEffect, useState } from 'react'
import { useBoardStore } from '../store/boardStore'
import { useDemoStore } from '../store/demoStore'
import { PRESET_DEMOS } from '../demos'
import { exportDemoGif, exportDemoVideo, exportFramesGrid } from '../export'
import NameModal from './NameModal'

/** 战术演示面板：帧编排 + 播放控制 + 模板 + 导出 */
export default function DemoPanel() {
  const activeDemo = useBoardStore((s) => s.activeDemo)
  const demoLibrary = useBoardStore((s) => s.demoLibrary)
  const applyDemoPreset = useBoardStore((s) => s.applyDemoPreset)
  const startDemo = useBoardStore((s) => s.startDemo)
  const recordFrame = useBoardStore((s) => s.recordFrame)
  const deleteFrame = useBoardStore((s) => s.deleteFrame)
  const updateFrameNote = useBoardStore((s) => s.updateFrameNote)
  const saveDemoToLibrary = useBoardStore((s) => s.saveDemoToLibrary)
  const players = useBoardStore((s) => s.players)
  const field = useBoardStore((s) => s.field)
  const oppField = useBoardStore((s) => s.oppField)

  const demoMode = useDemoStore((s) => s.mode)
  const playing = useDemoStore((s) => s.playing)
  const frameIndex = useDemoStore((s) => s.frameIndex)
  const speed = useDemoStore((s) => s.speed)
  const previewIndex = useDemoStore((s) => s.previewIndex)
  const close = useDemoStore((s) => s.close)
  const enterEdit = useDemoStore((s) => s.enterEdit)
  const enterPlay = useDemoStore((s) => s.enterPlay)
  const play = useDemoStore((s) => s.play)
  const pause = useDemoStore((s) => s.pause)
  const goto = useDemoStore((s) => s.goto)
  const stepNext = useDemoStore((s) => s.stepNext)
  const stepPrev = useDemoStore((s) => s.stepPrev)
  const setSpeed = useDemoStore((s) => s.setSpeed)
  const setPreview = useDemoStore((s) => s.setPreview)

  const [demoId, setDemoId] = useState('')
  const [nameModal, setNameModal] = useState(false)
  const [busy, setBusy] = useState(false)

  const frames = activeDemo?.frames ?? []
  const selectedFrame = demoMode === 'play' ? frameIndex : (previewIndex ?? frames.length - 1)

  // 播放推进（rAF 循环）
  useEffect(() => {
    if (demoMode !== 'play' || !playing) return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      useDemoStore.getState().tick((now - last) / 1000)
      last = now
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [demoMode, playing])

  const onPlayToggle = () => {
    if (demoMode === 'edit') {
      enterPlay(previewIndex ?? 0)
    } else if (playing) {
      pause()
    } else {
      play()
    }
  }

  const onRecord = () => {
    if (demoMode === 'play') enterEdit() // 播放中点击记录：自动返回编辑模式再记录
    recordFrame()
    setPreview(frames.length) // 记录后选中新帧，便于直接编辑其说明
  }

  const onDelete = () => {
    if (frames.length === 0) return
    if (demoMode === 'play') pause()
    deleteFrame(selectedFrame)
    setPreview(null)
    goto(Math.max(0, selectedFrame - 1))
  }

  const runExport = async (fn: () => Promise<void>) => {
    if (!activeDemo || activeDemo.frames.length === 0 || busy) return
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      console.error('导出失败', err)
      window.alert('导出失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  const exportCtx = { players, field, oppField }

  return (
    <div className="demo-panel">
      <div className="demo-row">
        <div className="tool-group">
          <span className="tool-label">演示</span>
          <select value={demoId} onChange={(e) => setDemoId(e.target.value)}>
            <option value="">选择演示模板</option>
            <optgroup label="预设模板">
              {PRESET_DEMOS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </optgroup>
            {demoLibrary.length > 0 && (
              <optgroup label="我的演示">
                {demoLibrary.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            className="tool-btn"
            disabled={!demoId}
            onClick={() => {
              applyDemoPreset(demoId)
              setDemoId('')
              enterEdit()
              setPreview(null)
            }}
          >
            应用
          </button>
          <button className="tool-btn" onClick={() => setNameModal(true)}>
            保存演示
          </button>
          <button
            className="tool-btn"
            title="以当前站位新建演示（清空现有帧）"
            onClick={() => {
              if (window.confirm('新建演示将替换当前演示内容，确定？')) {
                useBoardStore.getState().closeDemo()
                startDemo()
                enterEdit()
                setPreview(null)
                goto(0)
              }
            }}
          >
            新建
          </button>
          <button className="tool-btn danger" onClick={close} title="关闭演示面板">
            退出演示
          </button>
        </div>

        <div className="tool-group">
          <span className="tool-label">帧（{frames.length}）</span>
          <div className="chips">
            {frames.map((f, i) => {
              const active = demoMode === 'play' ? i === frameIndex : i === previewIndex
              return (
                <button
                  key={i}
                  className={`frame-chip${active ? ' active' : ''}`}
                  title={f.note || `第 ${i + 1} 帧`}
                  onClick={() => {
                    if (demoMode === 'play') goto(i)
                    else setPreview(i)
                  }}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
          <button
            className="tool-btn primary"
            title="把当前站位/足球/绘制箭头记录为新帧（播放中会自动返回编辑）"
            onClick={onRecord}
          >
            ＋ 记录帧
          </button>
          <button
            className="tool-btn danger"
            disabled={frames.length === 0}
            title="删除选中帧（编辑/播放模式均可）"
            onClick={onDelete}
          >
            删除帧
          </button>
        </div>

        <div className="tool-group">
          <span className="tool-label">说明</span>
          <input
            className="demo-note-input"
            placeholder="选中帧的说明文字（显示在球场上）"
            value={frames[selectedFrame]?.note ?? ''}
            disabled={frames.length === 0}
            onChange={(e) => {
              if (selectedFrame >= 0) updateFrameNote(selectedFrame, e.target.value)
            }}
          />
        </div>
      </div>

      <div className="demo-row">
        <div className="tool-group">
          <button
            className="tool-btn"
            title="上一步"
            disabled={demoMode !== 'play'}
            onClick={stepPrev}
          >
            ⏮
          </button>
          <button
            className="tool-btn primary"
            title={playing ? '暂停' : '播放'}
            disabled={frames.length < 2}
            onClick={onPlayToggle}
          >
            {demoMode === 'play' && playing ? '⏸ 暂停' : '▶ 播放'}
          </button>
          <button
            className="tool-btn"
            title="下一步"
            disabled={demoMode !== 'play'}
            onClick={stepNext}
          >
            ⏭
          </button>
          <label className="tool-label">
            倍速
            <select
              className="speed-select"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2×</option>
            </select>
          </label>
          <span className="demo-progress">
            {demoMode === 'play'
              ? `第 ${frameIndex + 1} / ${frames.length} 帧`
              : previewIndex !== null
                ? `预览第 ${previewIndex + 1} 帧`
                : '编辑模式'}
          </span>
          {demoMode === 'play' && (
            <button className="tool-btn" title="返回编辑，继续调整球员并记录帧" onClick={enterEdit}>
              ✎ 返回编辑
            </button>
          )}
        </div>

        <span className="tool-sep" />

        <div className="tool-group">
          <button
            className="tool-btn"
            disabled={busy || frames.length === 0}
            title="导出分帧图（2 列网格单张 PNG）"
            onClick={() => runExport(() => exportFramesGrid(activeDemo!, exportCtx))}
          >
            分帧图
          </button>
          <button
            className="tool-btn"
            disabled={busy || frames.length < 2}
            title="导出 GIF 动图（12fps）"
            onClick={() => runExport(() => exportDemoGif(activeDemo!, exportCtx))}
          >
            GIF
          </button>
          <button
            className="tool-btn"
            disabled={busy || frames.length < 2}
            title="导出 MP4/WebM 视频（按当前倍速）"
            onClick={() => runExport(() => exportDemoVideo(activeDemo!, exportCtx, speed))}
          >
            视频
          </button>
          {busy && <span className="demo-progress">导出中…</span>}
        </div>
      </div>

      {nameModal && (
        <NameModal
          title="保存演示"
          initial={activeDemo?.name ?? '我的演示'}
          onSubmit={saveDemoToLibrary}
          onClose={() => setNameModal(false)}
        />
      )}
    </div>
  )
}
