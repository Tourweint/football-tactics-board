import type { ArrowDef, ArrowType, DemoFrame, TacticDemo, XY } from './types'

/** 每段（相邻两帧之间）的播放时长（秒，1 倍速） */
export const DEMO_SEG_DURATION = 1.2

let uid = 0
const A = (type: ArrowType, from: XY, to: XY): ArrowDef => ({
  id: `da${uid++}`,
  type,
  from,
  to,
})
const P = (playerId: string, x: number, y: number): [string, number, number] => [
  playerId,
  x,
  y,
]
const F = (
  pos: Array<[string, number, number]>,
  ball: XY | null,
  arrows: ArrowDef[],
  note?: string,
): DemoFrame => ({
  playerPositions: pos.map(([playerId, x, y]) => ({ playerId, x, y })),
  ball,
  arrows,
  note,
})

/**
 * 预设演示模板
 * 坐标均为归一化值（本方球门在左、向右进攻）；球员 id 对应默认首发（seed-1 门将 ~ seed-11 右边锋）
 */
export const PRESET_DEMOS: TacticDemo[] = [
  {
    id: 'demo-corner',
    name: '角球·前点抢点',
    isPreset: true,
    frames: [
      F(
        [
          P('seed-1', 12, 50), P('seed-2', 48, 12), P('seed-3', 52, 35),
          P('seed-4', 55, 58), P('seed-5', 52, 80), P('seed-6', 62, 45),
          P('seed-7', 72, 32), P('seed-8', 68, 62), P('seed-9', 88, 12),
          P('seed-10', 80, 36), P('seed-11', 86, 58),
        ],
        { x: 97, y: 4 },
        [
          A('pass', { x: 97, y: 4 }, { x: 82, y: 32 }),
          A('run', { x: 78, y: 40 }, { x: 81, y: 31 }),
          A('run', { x: 86, y: 60 }, { x: 87, y: 52 }),
        ],
        '角球开出 · 前点抢点',
      ),
      F(
        [
          P('seed-1', 12, 50), P('seed-2', 48, 12), P('seed-3', 58, 38),
          P('seed-4', 55, 58), P('seed-5', 52, 80), P('seed-6', 62, 45),
          P('seed-7', 74, 34), P('seed-8', 68, 62), P('seed-9', 87, 14),
          P('seed-10', 81, 31), P('seed-11', 87, 54),
        ],
        { x: 88, y: 32 },
        [A('run', { x: 79, y: 35 }, { x: 82, y: 31 })],
        '球飞向前点',
      ),
      F(
        [
          P('seed-1', 12, 50), P('seed-2', 48, 12), P('seed-3', 62, 40),
          P('seed-4', 56, 56), P('seed-5', 52, 80), P('seed-6', 63, 44),
          P('seed-7', 78, 36), P('seed-8', 69, 60), P('seed-9', 86, 16),
          P('seed-10', 84, 33), P('seed-11', 88, 52),
        ],
        { x: 86, y: 35 },
        [A('run', { x: 76, y: 38 }, { x: 80, y: 36 })],
        '冲顶攻门',
      ),
      F(
        [
          P('seed-1', 12, 50), P('seed-2', 48, 12), P('seed-3', 66, 42),
          P('seed-4', 58, 54), P('seed-5', 52, 80), P('seed-6', 65, 46),
          P('seed-7', 82, 38), P('seed-8', 71, 58), P('seed-9', 85, 18),
          P('seed-10', 86, 37), P('seed-11', 90, 50),
        ],
        { x: 96, y: 46 },
        [A('pass', { x: 88, y: 36 }, { x: 96, y: 46 })],
        '皮球入网',
      ),
    ],
  },
  {
    id: 'demo-fk',
    name: '任意球·战术配合',
    isPreset: true,
    frames: [
      F(
        [
          P('seed-1', 12, 50), P('seed-2', 30, 20), P('seed-3', 25, 38),
          P('seed-4', 25, 62), P('seed-5', 30, 80), P('seed-6', 55, 48),
          P('seed-7', 70, 60), P('seed-8', 60, 55), P('seed-9', 78, 20),
          P('seed-10', 72, 45), P('seed-11', 78, 80),
        ],
        { x: 62, y: 55 },
        [A('pass', { x: 62, y: 55 }, { x: 70, y: 62 })],
        '短传启动',
      ),
      F(
        [
          P('seed-1', 12, 50), P('seed-2', 30, 20), P('seed-3', 25, 38),
          P('seed-4', 25, 62), P('seed-5', 30, 80), P('seed-6', 55, 48),
          P('seed-7', 74, 58), P('seed-8', 68, 57), P('seed-9', 78, 20),
          P('seed-10', 74, 42), P('seed-11', 78, 80),
        ],
        { x: 71, y: 61 },
        [A('pass', { x: 71, y: 61 }, { x: 77, y: 57 })],
        '回做空当',
      ),
      F(
        [
          P('seed-1', 12, 50), P('seed-2', 30, 20), P('seed-3', 25, 38),
          P('seed-4', 25, 62), P('seed-5', 30, 80), P('seed-6', 55, 48),
          P('seed-7', 78, 54), P('seed-8', 70, 58), P('seed-9', 79, 24),
          P('seed-10', 76, 40), P('seed-11', 79, 80),
        ],
        { x: 77, y: 56 },
        [A('run', { x: 74, y: 43 }, { x: 79, y: 47 })],
        '后插上接球',
      ),
      F(
        [
          P('seed-1', 12, 50), P('seed-2', 30, 20), P('seed-3', 25, 38),
          P('seed-4', 25, 62), P('seed-5', 30, 80), P('seed-6', 55, 48),
          P('seed-7', 80, 50), P('seed-8', 72, 58), P('seed-9', 80, 26),
          P('seed-10', 78, 44), P('seed-11', 80, 78),
        ],
        { x: 90, y: 48 },
        [A('pass', { x: 80, y: 51 }, { x: 90, y: 48 })],
        '完成射门',
      ),
    ],
  },
  {
    id: 'demo-press',
    name: '高位逼抢跑位',
    isPreset: true,
    frames: [
      F(
        [
          P('seed-1', 10, 50), P('seed-2', 24, 14), P('seed-3', 18, 36),
          P('seed-4', 18, 64), P('seed-5', 24, 86), P('seed-6', 40, 50),
          P('seed-7', 48, 35), P('seed-8', 48, 65), P('seed-9', 68, 20),
          P('seed-10', 74, 52), P('seed-11', 68, 80),
        ],
        { x: 76, y: 56 },
        [
          A('run', { x: 74, y: 52 }, { x: 82, y: 55 }),
          A('run', { x: 68, y: 20 }, { x: 76, y: 28 }),
          A('run', { x: 68, y: 80 }, { x: 76, y: 72 }),
        ],
        '集体压上逼抢',
      ),
      F(
        [
          P('seed-1', 14, 50), P('seed-2', 28, 16), P('seed-3', 22, 38),
          P('seed-4', 22, 62), P('seed-5', 28, 84), P('seed-6', 46, 50),
          P('seed-7', 54, 38), P('seed-8', 54, 62), P('seed-9', 75, 26),
          P('seed-10', 80, 54), P('seed-11', 75, 74),
        ],
        { x: 78, y: 52 },
        [A('run', { x: 80, y: 54 }, { x: 86, y: 52 })],
        '压迫持球人',
      ),
      F(
        [
          P('seed-1', 18, 50), P('seed-2', 32, 18), P('seed-3', 26, 40),
          P('seed-4', 26, 60), P('seed-5', 32, 82), P('seed-6', 52, 50),
          P('seed-7', 60, 40), P('seed-8', 60, 60), P('seed-9', 80, 24),
          P('seed-10', 86, 50), P('seed-11', 80, 76),
        ],
        { x: 88, y: 50 },
        [A('run', { x: 84, y: 52 }, { x: 88, y: 50 })],
        '逼向对方门将',
      ),
    ],
  },
]

/** 线性插值 */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** 帧间平滑缓动（smoothstep） */
const ease = (t: number) => t * t * (3 - 2 * t)

/**
 * 取演示在指定帧 / 段内进度的渲染状态：
 * 球员与足球在相邻帧间平滑插值，箭头与说明显示当前段（起点帧）的内容
 */
export function demoFrameState(
  demo: TacticDemo,
  index: number,
  progress: number,
): {
  positions: Map<string, XY>
  ball: XY | null
  arrows: ArrowDef[]
  note?: string
} {
  const frames = demo.frames
  const fi = Math.max(0, Math.min(index, frames.length - 1))
  const frame = frames[fi]
  const next = frames[Math.min(fi + 1, frames.length - 1)]
  const p = fi === frames.length - 1 ? 0 : ease(Math.max(0, Math.min(1, progress)))

  const positions = new Map<string, XY>()
  for (const pos of frame.playerPositions) {
    const np = next.playerPositions.find((q) => q.playerId === pos.playerId)
    positions.set(
      pos.playerId,
      np ? { x: lerp(pos.x, np.x, p), y: lerp(pos.y, np.y, p) } : { x: pos.x, y: pos.y },
    )
  }
  const ball =
    frame.ball && next.ball
      ? { x: lerp(frame.ball.x, next.ball.x, p), y: lerp(frame.ball.y, next.ball.y, p) }
      : (frame.ball ?? next.ball)

  return { positions, ball, arrows: frame.arrows, note: frame.note }
}

/** 深拷贝演示（应用模板时生成独立实例） */
export function cloneDemo(d: TacticDemo): TacticDemo {
  return {
    ...d,
    id: `demo-${crypto.randomUUID()}`,
    frames: d.frames.map((f) => ({
      ...f,
      playerPositions: f.playerPositions.map((p) => ({ ...p })),
      ball: f.ball ? { ...f.ball } : null,
      arrows: f.arrows.map((a) => ({
        ...a,
        id: crypto.randomUUID(),
        from: { ...a.from },
        to: { ...a.to },
      })),
    })),
  }
}
