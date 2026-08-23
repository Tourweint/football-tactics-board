import type { ArrowDef, ArrowType, Tactic, TextDef, XY, ZoneDef } from './types'

/** 区域统一使用黄色 */
const AMBER = '#fbbf24'

const arrow = (type: ArrowType, from: XY, to: XY, id: string): ArrowDef => ({ id, type, from, to })
const zone = (x: number, y: number, w: number, h: number, color: string, id: string): ZoneDef => ({
  id,
  x,
  y,
  w,
  h,
  color,
})
const text = (x: number, y: number, t: string, id: string): TextDef => ({ id, x, y, text: t })

/** 预设战术库：坐标均为归一化值（本方球门在左、向右进攻） */
export const PRESET_TACTICS: Tactic[] = [
  // ---------- 进攻 ----------
  {
    id: 'press',
    name: '高位逼抢',
    type: 'attack',
    description: '前场集体压迫，切断对方出球线路',
    isPreset: true,
    zones: [
      zone(58, 2, 42, 96, AMBER, 'press-z1'),
      zone(74, 8, 26, 84, AMBER, 'press-z2'),
    ],
    arrows: [
      arrow('run', { x: 72, y: 50 }, { x: 85, y: 50 }, 'press-a1'),
      arrow('run', { x: 68, y: 18 }, { x: 80, y: 32 }, 'press-a2'),
      arrow('run', { x: 68, y: 82 }, { x: 80, y: 68 }, 'press-a3'),
      arrow('run', { x: 50, y: 32 }, { x: 68, y: 45 }, 'press-a4'),
      arrow('run', { x: 50, y: 68 }, { x: 68, y: 55 }, 'press-a5'),
    ],
    texts: [text(80, 12, '前场集体压上', 'press-t1')],
  },
  {
    id: 'counter',
    name: '快速反击',
    type: 'attack',
    description: '断球后快速向前出球，利用对方身后空间',
    isPreset: true,
    zones: [],
    arrows: [
      arrow('pass', { x: 8, y: 50 }, { x: 30, y: 45 }, 'counter-a1'),
      arrow('pass', { x: 30, y: 45 }, { x: 56, y: 22 }, 'counter-a2'),
      arrow('run', { x: 46, y: 58 }, { x: 72, y: 32 }, 'counter-a3'),
      arrow('run', { x: 52, y: 35 }, { x: 76, y: 52 }, 'counter-a4'),
    ],
    texts: [text(54, 8, '断球后快速出球', 'counter-t1')],
  },
  {
    id: 'wing-cross',
    name: '边路传中',
    type: 'attack',
    description: '边路下底传中，中锋与后点包抄',
    isPreset: true,
    zones: [],
    arrows: [
      arrow('run', { x: 62, y: 80 }, { x: 88, y: 86 }, 'wc-a1'),
      arrow('pass', { x: 88, y: 86 }, { x: 84, y: 45 }, 'wc-a2'),
      arrow('run', { x: 70, y: 55 }, { x: 83, y: 42 }, 'wc-a3'),
      arrow('run', { x: 55, y: 40 }, { x: 74, y: 58 }, 'wc-a4'),
    ],
    texts: [text(78, 95, '下底传中', 'wc-t1')],
  },
  {
    id: 'through-middle',
    name: '中路渗透',
    type: 'attack',
    description: '短传推进，直塞打防线身后',
    isPreset: true,
    zones: [],
    arrows: [
      arrow('pass', { x: 46, y: 50 }, { x: 60, y: 48 }, 'tm-a1'),
      arrow('pass', { x: 60, y: 48 }, { x: 78, y: 52 }, 'tm-a2'),
      arrow('run', { x: 54, y: 34 }, { x: 70, y: 42 }, 'tm-a3'),
      arrow('run', { x: 54, y: 66 }, { x: 70, y: 58 }, 'tm-a4'),
    ],
    texts: [text(76, 62, '直塞打身后', 'tm-t1')],
  },
  {
    id: 'long-ball',
    name: '长传冲吊',
    type: 'attack',
    description: '长传找中锋，争抢第二落点',
    isPreset: true,
    zones: [],
    arrows: [
      arrow('pass', { x: 14, y: 42 }, { x: 70, y: 52 }, 'lb-a1'),
      arrow('run', { x: 66, y: 30 }, { x: 76, y: 48 }, 'lb-a2'),
      arrow('run', { x: 66, y: 70 }, { x: 74, y: 56 }, 'lb-a3'),
    ],
    texts: [text(68, 12, '长传找中锋', 'lb-t1')],
  },
  // ---------- 防守 ----------
  {
    id: 'zonal',
    name: '区域防守',
    type: 'defense',
    description: '守住本方三区，保持阵型整体移动',
    isPreset: true,
    zones: [zone(8, 4, 30, 92, AMBER, 'zonal-z1')],
    arrows: [
      arrow('run', { x: 20, y: 32 }, { x: 27, y: 40 }, 'zonal-a1'),
      arrow('run', { x: 20, y: 68 }, { x: 27, y: 60 }, 'zonal-a2'),
      arrow('run', { x: 34, y: 50 }, { x: 28, y: 50 }, 'zonal-a3'),
    ],
    texts: [text(15, 14, '保持阵型整体移动', 'zonal-t1')],
  },
  {
    id: 'man-marking',
    name: '人盯人',
    type: 'defense',
    description: '每人就近跟防一名对方球员',
    isPreset: true,
    zones: [],
    arrows: [
      arrow('run', { x: 22, y: 28 }, { x: 58, y: 34 }, 'mm-a1'),
      arrow('run', { x: 20, y: 50 }, { x: 64, y: 50 }, 'mm-a2'),
      arrow('run', { x: 22, y: 72 }, { x: 58, y: 66 }, 'mm-a3'),
    ],
    texts: [text(40, 10, '就近跟防', 'mm-t1')],
  },
  {
    id: 'low-block',
    name: '低位防守',
    type: 'defense',
    description: '收缩禁区前沿，堵住中路空间',
    isPreset: true,
    zones: [zone(8, 10, 26, 80, AMBER, 'lb-z1'), zone(8, 20, 18, 60, AMBER, 'lb-z2')],
    arrows: [
      arrow('run', { x: 22, y: 36 }, { x: 29, y: 42 }, 'lbd-a1'),
      arrow('run', { x: 22, y: 64 }, { x: 29, y: 58 }, 'lbd-a2'),
    ],
    texts: [text(12, 6, '收缩禁区前沿', 'lbd-t1')],
  },
  {
    id: 'offside-trap',
    name: '造越位',
    type: 'defense',
    description: '防线统一前压，让进攻方落入越位',
    isPreset: true,
    zones: [zone(38, 2, 2.5, 96, AMBER, 'ot-z1')],
    arrows: [
      arrow('run', { x: 28, y: 30 }, { x: 39, y: 26 }, 'ot-a1'),
      arrow('run', { x: 28, y: 70 }, { x: 39, y: 74 }, 'ot-a2'),
    ],
    texts: [text(45, 46, '防线统一前压', 'ot-t1')],
  },
  // ---------- 定位球 ----------
  {
    id: 'corner-near',
    name: '角球·前点',
    type: 'setpiece',
    description: '角球开前点，多人冲顶抢点',
    isPreset: true,
    zones: [zone(83, 22, 16, 34, AMBER, 'cn-z1')],
    arrows: [
      arrow('pass', { x: 99, y: 4 }, { x: 90, y: 32 }, 'cn-a1'),
      arrow('run', { x: 85, y: 36 }, { x: 88, y: 27 }, 'cn-a2'),
      arrow('run', { x: 80, y: 62 }, { x: 87, y: 50 }, 'cn-a3'),
    ],
    texts: [text(92, 58, '角球·前点', 'cn-t1')],
  },
  {
    id: 'fk-routine',
    name: '任意球·战术配合',
    type: 'setpiece',
    description: '短传配合制造射门角度',
    isPreset: true,
    zones: [],
    arrows: [
      arrow('pass', { x: 56, y: 56 }, { x: 63, y: 52 }, 'fk-a1'),
      arrow('pass', { x: 63, y: 52 }, { x: 76, y: 62 }, 'fk-a2'),
      arrow('run', { x: 70, y: 46 }, { x: 80, y: 58 }, 'fk-a3'),
    ],
    texts: [text(58, 38, '短传后射门', 'fk-t1')],
  },
]

/** 战术类型 → 分组标签 */
export const TACTIC_TYPE_LABELS: Record<Tactic['type'], string> = {
  attack: '进攻',
  defense: '防守',
  setpiece: '定位球',
  custom: '我的战术',
}
