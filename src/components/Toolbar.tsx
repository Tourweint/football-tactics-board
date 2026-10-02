import { useRef, useState, type ReactNode } from 'react'
import { toPng } from 'html-to-image'
import { useBoardStore } from '../store/boardStore'
import { useDemoStore } from '../store/demoStore'
import { useToolStore, type DrawTool } from '../store/toolStore'
import { useUIStore } from '../store/uiStore'
import { findFormation, PRESET_FORMATIONS } from '../formations'
import NameModal from './NameModal'

/** 16×16 线性小图标（currentColor 描边，随按钮状态变色） */
const icon = (paths: ReactNode) => (
  <svg
    viewBox="0 0 16 16"
    width={14}
    height={14}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
)

/** 绘制工具按钮定义（图标 + 文字） */
const DRAW_TOOLS: Array<{ id: DrawTool; label: string; title: string; icon: ReactNode }> = [
  {
    id: 'select',
    label: '移动',
    title: '移动球员（默认）',
    icon: icon(
      <>
        <path d="M8 2.5v11M2.5 8h11" />
        <path d="M8 2.5 6.5 4M8 2.5 9.5 4M8 13.5 6.5 12M8 13.5 9.5 12M2.5 8 4 6.5M2.5 8 4 9.5M13.5 8 12 6.5M13.5 8 12 9.5" />
      </>,
    ),
  },
  {
    id: 'pass',
    label: '传球',
    title: '绘制传球箭头（实线）',
    icon: icon(<path d="M2.5 13.5 12.5 3.5M7 3.5h5.5V9" />),
  },
  {
    id: 'run',
    label: '跑位',
    title: '绘制跑位箭头（虚线）',
    icon: icon(
      <>
        <path d="M2.5 13.5 12.5 3.5" strokeDasharray="2.2 1.8" />
        <path d="M7 3.5h5.5V9" />
      </>,
    ),
  },
  {
    id: 'curve',
    label: '弧线',
    title: '绘制弧线：点击起点 → 点击弯点 → 点击终点（Esc 取消）',
    icon: icon(
      <>
        <path d="M2.5 13.5C5.5 4.5 10.5 4.5 13.5 11.5" />
        <path d="M12 8.5l1.5 3-3-.5" />
      </>,
    ),
  },
  {
    id: 'zone',
    label: '区域',
    title: '框选高亮区域',
    icon: icon(<rect x="2.5" y="3.5" width="11" height="9" rx="1" strokeDasharray="3 2" />),
  },
  {
    id: 'text',
    label: '文字',
    title: '点击球场添加文字标注',
    icon: icon(<path d="M3.5 4h9M8 4v8.5" />),
  },
  {
    id: 'eraser',
    label: '橡皮',
    title: '点击删除箭头/区域/文字；点球员移回替补席、点足球移除',
    icon: icon(
      <>
        <path d="M2.5 10.5 9 4l3 3-6.5 6.5H4.2z" />
        <path d="M4.3 8.7 7.3 11.7" />
        <path d="M2.5 15h11" />
      </>,
    ),
  },
]

/** 演示按钮图标 */
const demoIcon = icon(
  <>
    <rect x="1.5" y="3" width="13" height="10" rx="2" />
    <path d="M6.5 5.8v4.4L10.5 8z" fill="currentColor" stroke="none" />
  </>,
)

/** 顶部工具栏：模式切换 + 阵型 + 方案 + 导出 / 战术库 + 绘制 + 演示 + 撤销 */
export default function Toolbar() {
  const mode = useBoardStore((s) => s.mode)
  const setMode = useBoardStore((s) => s.setMode)
  const formationId = useBoardStore((s) => s.formationId)
  const customFormations = useBoardStore((s) => s.customFormations)
  const oppFormationId = useBoardStore((s) => s.oppFormationId)
  const applyFormation = useBoardStore((s) => s.applyFormation)
  const oppApplyFormation = useBoardStore((s) => s.oppApplyFormation)
  const saveCustomFormation = useBoardStore((s) => s.saveCustomFormation)
  const deleteCustomFormation = useBoardStore((s) => s.deleteCustomFormation)

  const plans = useBoardStore((s) => s.plans)
  const currentPlanId = useBoardStore((s) => s.currentPlanId)
  const savePlan = useBoardStore((s) => s.savePlan)
  const loadPlan = useBoardStore((s) => s.loadPlan)
  const deletePlan = useBoardStore((s) => s.deletePlan)
  const newPlan = useBoardStore((s) => s.newPlan)
  const importPlan = useBoardStore((s) => s.importPlan)

  const customElements = useBoardStore((s) => s.customElements)
  const clearCustomElements = useBoardStore((s) => s.clearCustomElements)
  const undo = useBoardStore((s) => s.undo)
  const redo = useBoardStore((s) => s.redo)
  const ball = useBoardStore((s) => s.ball)
  const removeBall = useBoardStore((s) => s.removeBall)
  const restoreBall = useBoardStore((s) => s.restoreBall)

  const tool = useToolStore((s) => s.tool)
  const setTool = useToolStore((s) => s.setTool)
  const demoOpen = useDemoStore((s) => s.demoOpen)
  const openDemo = useDemoStore((s) => s.open)
  const closeDemo = useDemoStore((s) => s.close)
  const orientation = useBoardStore((s) => s.pitchOrientation)
  const setOrientation = useBoardStore((s) => s.setPitchOrientation)
  const toolsOpen = useUIStore((s) => s.toolsOpen)
  const toggleTools = useUIStore((s) => s.toggleTools)
  const toggleRoster = useUIStore((s) => s.toggleRoster)

  const [nameModal, setNameModal] = useState<{
    title: string
    initial: string
    onSubmit: (name: string) => void
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedFormation = findFormation(formationId, customFormations)
  const currentPlan = plans.find((p) => p.id === currentPlanId)
  const customElementCount =
    customElements.arrows.length + customElements.zones.length + customElements.texts.length

  /** 导出战术板 PNG */
  const exportPng = async () => {
    const el = document.querySelector<HTMLElement>('[data-pitch]')
    if (!el) return
    try {
      const dataUrl = await toPng(el, { pixelRatio: 2 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `战术板-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
    } catch (err) {
      console.error('导出 PNG 失败', err)
      window.alert('导出失败，请重试')
    }
  }

  /** 保存方案：已关联方案则覆盖，否则弹窗命名新建 */
  const onSavePlan = () => {
    if (currentPlan) {
      savePlan(currentPlan.name)
    } else {
      setNameModal({ title: '保存当前方案', initial: '我的方案', onSubmit: savePlan })
    }
  }

  /** 导出当前战术板为 JSON 文件 */
  const exportJson = () => {
    const s = useBoardStore.getState()
    const state = {
      mode: s.mode,
      players: s.players,
      field: s.field,
      bench: s.bench,
      formationId: s.formationId,
      oppField: s.oppField,
      oppFormationId: s.oppFormationId,
      customFormations: s.customFormations,
      customElements: s.customElements,
      ball: s.ball,
      activeDemo: s.activeDemo,
    }
    const json = JSON.stringify({ name: currentPlan?.name ?? '战术方案', version: 1, state }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentPlan?.name ?? '战术方案'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** 导入 JSON 方案文件 */
  const importJson = (file: File) => {
    file
      .text()
      .then((text) => {
        try {
          const data = JSON.parse(text)
          const state = data.state ?? data
          if (
            !state ||
            !Array.isArray(state.players) ||
            !Array.isArray(state.field) ||
            state.field.length > 11 ||
            !Array.isArray(state.bench) ||
            !Array.isArray(state.oppField)
          ) {
            window.alert('文件格式不正确：不是有效的战术方案文件')
            return
          }
          importPlan(String(data.name ?? file.name.replace(/\.json$/i, '')), state)
        } catch {
          window.alert('文件解析失败：不是有效的 JSON')
        }
      })
      .catch(() => window.alert('文件读取失败'))
  }


  return (
    <header className="toolbar">
      <div className="toolbar-row">
        <div className="brand">
          ⚽ Football Tactics Board
          <span className="brand-sub">足球战术板</span>
        </div>

        <div className="toolbar-actions">
          <button className="tool-btn" title="收起/展开球队花名册" onClick={toggleRoster}>
            ☰ 花名册
          </button>
          <div className="mode-switch">
            <button
              className={mode === 'own' ? 'active' : ''}
              onClick={() => setMode('own')}
              title="只显示我方 11 名球员"
            >
              模式 1 · 我方
            </button>
            <button
              className={mode === 'both' ? 'active' : ''}
              onClick={() => setMode('both')}
              title="同场显示我方与对方 11 名球员"
            >
              模式 2 · 双方
            </button>
          </div>

          <div className="tool-group">
            <span className="tool-label">阵型</span>
            <select
              value={formationId ?? ''}
              onChange={(e) => e.target.value && applyFormation(e.target.value)}
            >
              <optgroup label="预设阵型">
                {PRESET_FORMATIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
              {customFormations.length > 0 && (
                <optgroup label="我的阵型">
                  {customFormations.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              className="tool-btn"
              title="把当前场上站位保存为自定义阵型"
              onClick={() =>
                setNameModal({
                  title: '保存当前阵型',
                  initial: `阵型-${customFormations.length + 1}`,
                  onSubmit: saveCustomFormation,
                })
              }
            >
              存为阵型
            </button>
            {selectedFormation && !selectedFormation.isPreset && (
              <button
                className="tool-btn danger"
                title="删除该阵型"
                onClick={() => {
                  if (window.confirm(`删除阵型「${selectedFormation.name}」？`)) {
                    deleteCustomFormation(selectedFormation.id)
                  }
                }}
              >
                ×
              </button>
            )}
          </div>

          {mode === 'both' && (
            <div className="tool-group">
              <span className="tool-label">对方阵型</span>
              <select
                value={oppFormationId ?? ''}
                onChange={(e) => e.target.value && oppApplyFormation(e.target.value)}
              >
                {PRESET_FORMATIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button
                className="tool-btn"
                title="按当前对方阵型重摆，并补齐被删除的对方球员"
                onClick={() => oppFormationId && oppApplyFormation(oppFormationId)}
              >
                重摆
              </button>
            </div>
          )}

          <div className="tool-group">
            <span className="tool-label">方案</span>
            <select
              value={currentPlanId ?? ''}
              onChange={(e) => e.target.value && loadPlan(e.target.value)}
            >
              <option value="">未保存</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button className="tool-btn" title="保存当前战术板" onClick={onSavePlan}>
              {currentPlan ? '保存' : '另存为'}
            </button>
            {currentPlan && (
              <button
                className="tool-btn danger"
                title="删除当前方案"
                onClick={() => {
                  if (window.confirm(`删除方案「${currentPlan.name}」？`)) {
                    deletePlan(currentPlan.id)
                  }
                }}
              >
                ×
              </button>
            )}
            <button
              className="tool-btn"
              title="清空当前战术板，开始新方案"
              onClick={() => {
                if (window.confirm('新建方案将清空当前战术板（可先保存当前方案），确定？')) {
                  newPlan()
                }
              }}
            >
              新建
            </button>
            <button className="tool-btn" title="把当前战术板导出为 JSON 文件" onClick={exportJson}>
              导出JSON
            </button>
            <button
              className="tool-btn"
              title="从 JSON 文件导入战术方案"
              onClick={() => fileRef.current?.click()}
            >
              导入JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) importJson(file)
                e.target.value = ''
              }}
            />
          </div>

          <button className="tool-btn primary" onClick={exportPng} title="把战术板导出为 PNG 图片">
            导出 PNG
          </button>

          <button
            className="tool-btn"
            title={
              orientation === 'landscape'
                ? '把球场切换为竖屏显示（适合手机）'
                : '把球场切换为横屏显示'
            }
            onClick={() =>
              setOrientation(orientation === 'landscape' ? 'portrait' : 'landscape')
            }
          >
            {orientation === 'landscape' ? '↻ 竖屏' : '↻ 横屏'}
          </button>

          <button
            className="tool-btn"
            title="收起/展开战术与绘制功能区"
            onClick={toggleTools}
          >
            {toolsOpen ? '▲ 功能区' : '▼ 功能区'}
          </button>
        </div>
      </div>

      {toolsOpen && (
      <div className="toolbar-row second">
        <div className="tool-group">
          <span className="tool-label">绘制</span>
          {DRAW_TOOLS.map((t) => (
            <button
              key={t.id}
              className={`draw-btn${tool === t.id ? ' active' : ''}`}
              title={t.title}
              onClick={() => setTool(t.id)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <button
          className={`draw-btn${demoOpen ? ' active' : ''}`}
          title="关键帧编排与动画演示（摆一步、录一步，可导出 GIF/视频）"
          onClick={() => (demoOpen ? closeDemo() : openDemo())}
        >
          {demoIcon}
          演示
        </button>

        <button
          className="tool-btn"
          title={ball ? '移除场上的足球' : '把足球放回中圈开球点'}
          onClick={() => (ball ? removeBall() : restoreBall())}
        >
          {ball ? '移除足球' : '添加足球'}
        </button>

        <div className="tool-group">
          <button
            className="tool-btn danger"
            disabled={customElementCount === 0}
            title="清空手绘的箭头/区域/文字（可撤销）"
            onClick={() => {
              if (window.confirm('清空全部手绘标注？')) clearCustomElements()
            }}
          >
            清空
          </button>
          <span className="tool-sep" />
          <button className="tool-btn" title="撤销（Ctrl+Z）" onClick={undo}>
            ⟲ 撤销
          </button>
          <button className="tool-btn" title="重做（Ctrl+Y / Ctrl+Shift+Z）" onClick={redo}>
            重做 ⟳
          </button>
        </div>
      </div>
      )}

      {nameModal && (
        <NameModal
          title={nameModal.title}
          initial={nameModal.initial}
          onSubmit={nameModal.onSubmit}
          onClose={() => setNameModal(null)}
        />
      )}
    </header>
  )
}
