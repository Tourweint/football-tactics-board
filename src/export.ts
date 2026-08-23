import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import type { ArrowDef, FieldSlot, OppSlot, Player, TacticDemo, XY } from './types'
import { demoFrameState, DEMO_SEG_DURATION } from './demos'
import { POSITION_COLOR } from './positions'

const OPP_COLOR = '#64748b'

export interface ExportContext {
  players: Player[]
  field: FieldSlot[]
  oppField: OppSlot[]
}

/** 下载 canvas 为 PNG */
function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return
    downloadBlob(blob, filename)
  }, 'image/png')
}

/** 下载 Blob */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** 绘制球场底色与标线 */
function drawPitchBase(c: CanvasRenderingContext2D, w: number, h: number) {
  // 草皮条纹
  for (let i = 0; i < 10; i++) {
    c.fillStyle = i % 2 === 0 ? '#2d8a3e' : '#338f45'
    c.fillRect((i * w) / 10, 0, w / 10 + 1, h)
  }
  const sx = w / 105
  const sy = h / 68
  c.strokeStyle = 'rgba(255,255,255,0.9)'
  c.lineWidth = 2
  // 边线
  c.strokeRect(0.5 * sx, 0.5 * sy, 104 * sx, 67 * sy)
  // 中线 + 中圈
  c.beginPath()
  c.moveTo(52.5 * sx, 0.5 * sy)
  c.lineTo(52.5 * sx, 67.5 * sy)
  c.stroke()
  c.beginPath()
  c.ellipse(52.5 * sx, 34 * sy, 9.15 * sx, 9.15 * sy, 0, 0, Math.PI * 2)
  c.stroke()
  // 禁区 / 小禁区 / 点球点
  c.strokeRect(0.5 * sx, 13.84 * sy, 16 * sx, 40.32 * sy)
  c.strokeRect(0.5 * sx, 24.84 * sy, 5 * sx, 18.32 * sy)
  c.strokeRect(88.5 * sx, 13.84 * sy, 16 * sx, 40.32 * sy)
  c.strokeRect(99.5 * sx, 24.84 * sy, 5 * sx, 18.32 * sy)
  c.beginPath()
  c.arc(11 * sx, 34 * sy, 2.5, 0, Math.PI * 2)
  c.arc(94 * sx, 34 * sy, 2.5, 0, Math.PI * 2)
  c.fillStyle = 'rgba(255,255,255,0.9)'
  c.fill()
  // 球门
  c.lineWidth = 5
  c.beginPath()
  c.moveTo(0.5 * sx, 30.34 * sy)
  c.lineTo(0.5 * sx, 37.66 * sy)
  c.moveTo(104.5 * sx, 30.34 * sy)
  c.lineTo(104.5 * sx, 37.66 * sy)
  c.stroke()
}

/** 绘制箭头（含头部） */
function drawArrow(
  c: CanvasRenderingContext2D,
  a: ArrowDef,
  w: number,
  h: number,
) {
  const fx = (a.from.x / 100) * w
  const fy = (a.from.y / 100) * h
  const tx = (a.to.x / 100) * w
  const ty = (a.to.y / 100) * h
  const dx = tx - fx
  const dy = ty - fy
  const len = Math.hypot(dx, dy)
  if (len < 0.001) return
  const ux = dx / len
  const uy = dy / len
  const headLen = 12
  const headW = 7
  const bx = tx - ux * headLen
  const by = ty - uy * headLen
  c.strokeStyle = a.type === 'pass' ? '#fbbf24' : '#e2e8f0'
  c.fillStyle = c.strokeStyle
  c.lineWidth = 4
  c.setLineDash(a.type === 'run' ? [10, 7] : [])
  c.beginPath()
  c.moveTo(fx, fy)
  c.lineTo(bx, by)
  c.stroke()
  c.setLineDash([])
  c.beginPath()
  c.moveTo(tx, ty)
  c.lineTo(bx - uy * headW, by + ux * headW)
  c.lineTo(bx + uy * headW, by - ux * headW)
  c.closePath()
  c.fill()
}

/** 绘制足球（白球 + 黑色五边形花纹） */
function drawBall(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  c.fillStyle = '#f8fafc'
  c.fill()
  c.lineWidth = 1.5
  c.strokeStyle = '#0f172a'
  c.stroke()
  // 中心五边形
  const pr = r * 0.45
  c.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const px = x + Math.cos(a) * pr
    const py = y + Math.sin(a) * pr
    if (i === 0) c.moveTo(px, py)
    else c.lineTo(px, py)
  }
  c.closePath()
  c.fillStyle = '#0f172a'
  c.fill()
  // 五条缝线
  c.lineWidth = 1
  c.strokeStyle = '#0f172a'
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    c.beginPath()
    c.moveTo(x + Math.cos(a) * pr, y + Math.sin(a) * pr)
    c.lineTo(x + Math.cos(a) * (r - 0.5), y + Math.sin(a) * (r - 0.5))
    c.stroke()
  }
}

/** 绘制球员圆标（号码） */
function drawToken(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  label: string,
  w: number,
  h: number,
  r = 20,
) {
  const px = (x / 100) * w
  const py = (y / 100) * h
  c.beginPath()
  c.arc(px, py, r, 0, Math.PI * 2)
  c.fillStyle = color
  c.fill()
  c.lineWidth = 2
  c.strokeStyle = 'rgba(255,255,255,0.35)'
  c.stroke()
  c.fillStyle = '#fff'
  c.font = `bold ${Math.round(r * 0.72)}px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif`
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText(label, px, py + 1)
}

/** 渲染一帧到 canvas */
export function renderFrame(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: {
    positions: Map<string, XY>
    field: FieldSlot[]
    playersById: Map<string, Player>
    oppField: OppSlot[]
    ball: XY | null
    arrows: ArrowDef[]
    note?: string
  },
) {
  drawPitchBase(c, w, h)
  for (const o of opts.oppField) {
    drawToken(c, o.x, o.y, OPP_COLOR, String(o.number), w, h)
  }
  for (const slot of opts.field) {
    const pos = opts.positions.get(slot.playerId) ?? slot
    const player = opts.playersById.get(slot.playerId)
    drawToken(
      c,
      pos.x,
      pos.y,
      POSITION_COLOR[slot.position],
      player ? String(player.number) : '?',
      w,
      h,
    )
  }
  if (opts.ball) {
    drawBall(c, (opts.ball.x / 100) * w, (opts.ball.y / 100) * h, 8)
  }
  for (const a of opts.arrows) drawArrow(c, a, w, h)
  if (opts.note) {
    const text = `▸ ${opts.note}`
    c.font = `14px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif`
    const tw = c.measureText(text).width
    c.fillStyle = 'rgba(0,0,0,0.55)'
    c.fillRect(10, h - 32, tw + 16, 24)
    c.fillStyle = '#fff'
    c.textAlign = 'left'
    c.textBaseline = 'middle'
    c.fillText(text, 18, h - 20)
  }
}

function makeContext(demo: TacticDemo, ctx: ExportContext) {
  const playersById = new Map(ctx.players.map((p) => [p.id, p]))
  return { demo, ctx, playersById }
}

/** 导出分帧图（2 列网格单张 PNG） */
export async function exportFramesGrid(demo: TacticDemo, ctx: ExportContext) {
  const { playersById } = makeContext(demo, ctx)
  const cellW = 420
  const cellH = 272
  const cols = 2
  const rows = Math.max(1, Math.ceil(demo.frames.length / cols))
  const canvas = document.createElement('canvas')
  canvas.width = cols * cellW + 24
  canvas.height = rows * (cellH + 34) + 16
  const c = canvas.getContext('2d')!
  c.fillStyle = '#0b1220'
  c.fillRect(0, 0, canvas.width, canvas.height)

  const cell = document.createElement('canvas')
  cell.width = cellW
  cell.height = cellH
  const cc = cell.getContext('2d')!

  demo.frames.forEach((_, i) => {
    const fs = demoFrameState(demo, i, 0)
    renderFrame(cc, cellW, cellH, {
      positions: fs.positions,
      field: ctx.field,
      playersById,
      oppField: ctx.oppField,
      ball: fs.ball,
      arrows: fs.arrows,
    })
    const col = i % cols
    const row = Math.floor(i / cols)
    const ox = 8 + col * (cellW + 8)
    const oy = 8 + row * (cellH + 34)
    c.drawImage(cell, ox, oy)
    const label = `第 ${i + 1} 帧${demo.frames[i].note ? ` · ${demo.frames[i].note}` : ''}`
    c.font = `13px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif`
    c.textAlign = 'left'
    c.textBaseline = 'middle'
    c.fillStyle = '#e5e7eb'
    c.fillText(label, ox, oy + cellH + 16)
  })
  downloadCanvas(canvas, '战术演示分解图.png')
}

/** 导出 GIF 动图 */
export async function exportDemoGif(demo: TacticDemo, ctx: ExportContext, fps = 12) {
  const { playersById } = makeContext(demo, ctx)
  const w = 420
  const h = 272
  const steps = Math.max(2, Math.round(DEMO_SEG_DURATION * fps))
  const gif = GIFEncoder()
  const cell = document.createElement('canvas')
  cell.width = w
  cell.height = h
  const c = cell.getContext('2d')!

  for (let i = 0; i < demo.frames.length; i++) {
    const count = i < demo.frames.length - 1 ? steps : 1
    for (let s = 0; s < count; s++) {
      const fs = demoFrameState(demo, i, i < demo.frames.length - 1 ? s / steps : 0)
      renderFrame(c, w, h, {
        positions: fs.positions,
        field: ctx.field,
        playersById,
        oppField: ctx.oppField,
        ball: fs.ball,
        arrows: fs.arrows,
      })
      const { data } = c.getImageData(0, 0, w, h)
      const palette = quantize(data, 256)
      const index = applyPalette(data, palette)
      gif.writeFrame(index, w, h, { palette, delay: 1000 / fps })
    }
  }
  gif.finish()
  downloadBlob(new Blob([new Uint8Array(gif.bytes())], { type: 'image/gif' }), '战术演示.gif')
}

/** 导出视频（MP4 优先，回退 WebM；按当前倍速录制） */
export async function exportDemoVideo(demo: TacticDemo, ctx: ExportContext, speed = 1) {
  const { playersById } = makeContext(demo, ctx)
  const w = 840
  const h = 544
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.style.position = 'fixed'
  canvas.style.left = '-9999px'
  document.body.appendChild(canvas)
  const c = canvas.getContext('2d')!

  const mime =
    ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) =>
      MediaRecorder.isTypeSupported(m),
    ) ?? 'video/webm'
  const stream = canvas.captureStream(30)
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3_000_000 })
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  const stopped = new Promise<void>((resolve) => {
    rec.onstop = () => resolve()
  })

  const drawAt = (t: number) => {
    const raw = t / DEMO_SEG_DURATION
    const idx = Math.min(demo.frames.length - 1, Math.floor(raw))
    const progress = idx >= demo.frames.length - 1 ? 0 : raw - idx
    const fs = demoFrameState(demo, idx, progress)
    renderFrame(c, w, h, {
      positions: fs.positions,
      field: ctx.field,
      playersById,
      oppField: ctx.oppField,
      ball: fs.ball,
      arrows: fs.arrows,
      note: fs.note,
    })
  }

  const total = ((demo.frames.length - 1) * DEMO_SEG_DURATION) / speed
  try {
    drawAt(0)
    rec.start()
    const t0 = performance.now()
    await new Promise<void>((resolve) => {
      const loop = () => {
        const t = ((performance.now() - t0) / 1000) * speed
        if (t >= total) {
          drawAt(total + 0.5) // 定格最后一帧
          resolve()
          return
        }
        drawAt(t)
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    })
    rec.stop()
    await stopped
    const ext = mime.includes('mp4') ? 'mp4' : 'webm'
    downloadBlob(new Blob(chunks, { type: rec.mimeType }), `战术演示.${ext}`)
  } finally {
    document.body.removeChild(canvas)
  }
}
