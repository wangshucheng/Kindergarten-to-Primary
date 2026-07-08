/**
 * 图形与几何（幼升小）纯逻辑层。
 * 与 React 解耦，便于单测；所有随机性通过注入的 rng 控制，保证可复现。
 *
 * 内容来源：content/geometry.md
 *  - 平面图形：长方形/正方形/三角形/圆形/平行四边形
 *  - 立体图形：长方体/正方体/圆柱/球
 *  - 拼搭计数 / 对称 / 角分类
 */

// ---------------------------------------------------------------------------
// 形状数据（与内容文档一一对应）
// ---------------------------------------------------------------------------

export type FlatShapeId = 'rectangle' | 'square' | 'triangle' | 'circle' | 'parallelogram';
export type SolidShapeId = 'cuboid' | 'cube' | 'cylinder' | 'sphere';
export type ShapeId = FlatShapeId | SolidShapeId;

export interface FlatShape {
  id: FlatShapeId;
  name: string;
  /** 边数（圆形为 0，表示曲线围成） */
  sides: number;
  isFlat: true;
  /** 是否为轴对称图形 */
  symmetric: boolean;
  features: string;
}

export interface SolidShape {
  id: SolidShapeId;
  name: string;
  faces: number;
  edges: number;
  vertices: number;
  /** 能否滚动 */
  canRoll: boolean;
  isFlat: false;
  /** 是否为轴对称图形 */
  symmetric: boolean;
  features: string;
}

export type Shape = FlatShape | SolidShape;

export const FLAT_SHAPES: FlatShape[] = [
  { id: 'rectangle', name: '长方形', sides: 4, isFlat: true, symmetric: true, features: '对边相等，4 个直角' },
  { id: 'square', name: '正方形', sides: 4, isFlat: true, symmetric: true, features: '四条边都相等，4 个直角' },
  { id: 'triangle', name: '三角形', sides: 3, isFlat: true, symmetric: false, features: '三条边、三个角' },
  { id: 'circle', name: '圆形', sides: 0, isFlat: true, symmetric: true, features: '圆圆的，没有角' },
  { id: 'parallelogram', name: '平行四边形', sides: 4, isFlat: true, symmetric: false, features: '对边平行相等，没有直角' },
];

export const SOLID_SHAPES: SolidShape[] = [
  { id: 'cuboid', name: '长方体', faces: 6, edges: 12, vertices: 8, canRoll: false, isFlat: false, symmetric: true, features: '6 个面，不能滚动' },
  { id: 'cube', name: '正方体', faces: 6, edges: 12, vertices: 8, canRoll: false, isFlat: false, symmetric: true, features: '6 个相同的正方形面，不能滚动' },
  { id: 'cylinder', name: '圆柱', faces: 3, edges: 0, vertices: 0, canRoll: true, isFlat: false, symmetric: true, features: '躺着能滚，立着不滚' },
  { id: 'sphere', name: '球', faces: 1, edges: 0, vertices: 0, canRoll: true, isFlat: false, symmetric: true, features: '能向任何方向滚' },
];

export const ALL_SHAPES: Shape[] = [...FLAT_SHAPES, ...SOLID_SHAPES];

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** Fisher–Yates 洗牌，使用注入的 rng 以保证可测与可复现 */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 从候选池中无放回采样 count 个，排除 exclude 中的元素 */
export function sampleDistinct<T>(pool: T[], count: number, exclude: T[], rng: () => number): T[] {
  const avail = pool.filter((x) => !exclude.includes(x));
  return shuffle(avail, rng).slice(0, count);
}

/** 在指定区间 [lo, hi] 内取 count 个不等于 exclude 的唯一整数（不足则放宽范围） */
function sampleInts(answer: number, count: number, rng: () => number): number[] {
  const used = new Set<number>([answer]);
  const result: number[] = [];
  let attempts = 0;
  while (result.length < count && attempts < 200) {
    attempts += 1;
    const offset = Math.floor(rng() * 7) - 3; // -3 .. +3
    const cand = answer + offset;
    if (cand < 1 || used.has(cand)) continue;
    used.add(cand);
    result.push(cand);
  }
  // 回退补齐（极端情形）
  for (let cand = 1; cand <= 50 && result.length < count; cand++) {
    if (used.has(cand)) continue;
    used.add(cand);
    result.push(cand);
  }
  return result;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ---------------------------------------------------------------------------
// 认图形：随机出「名称 / 平面还是立体 / 能否滚动」三选一
// ---------------------------------------------------------------------------

export type RecognizeKind = 'name' | 'category' | 'roll';

export interface RecognizeQuestion {
  kind: RecognizeKind;
  shapeId: ShapeId;
  shapeName: string;
  prompt: string;
  options: string[];
  answer: string;
}

export function makeRecognizeQuestion(rng: () => number = Math.random): RecognizeQuestion {
  const kind = pick<RecognizeKind>(['name', 'category', 'roll'], rng);

  if (kind === 'roll') {
    const shape = pick(SOLID_SHAPES, rng);
    const options = shuffle(['能滚动', '不能滚动'], rng);
    return {
      kind,
      shapeId: shape.id,
      shapeName: shape.name,
      prompt: `${shape.name}能滚动吗？`,
      options,
      answer: shape.canRoll ? '能滚动' : '不能滚动',
    };
  }

  const shape = pick(ALL_SHAPES, rng);

  if (kind === 'category') {
    const options = shuffle(['平面图形', '立体图形'], rng);
    return {
      kind,
      shapeId: shape.id,
      shapeName: shape.name,
      prompt: `${shape.name}是平面图形还是立体图形？`,
      options,
      answer: shape.isFlat ? '平面图形' : '立体图形',
    };
  }

  // kind === 'name'
  const distractors = sampleDistinct(
    ALL_SHAPES.map((s) => s.name),
    3,
    [shape.name],
    rng,
  );
  const options = shuffle([shape.name, ...distractors], rng);
  return {
    kind,
    shapeId: shape.id,
    shapeName: shape.name,
    prompt: '这是什么图形？',
    options,
    answer: shape.name,
  };
}

// ---------------------------------------------------------------------------
// 数方块：随机生成一列列堆叠的小正方体，问总数
// ---------------------------------------------------------------------------

export interface CubeStackQuestion {
  /** 每一列的小正方体个数（自下而上堆叠） */
  columns: number[];
  answer: number;
  options: number[];
}

export function makeCountCubesQuestion(rng: () => number = Math.random): CubeStackQuestion {
  const cols = 2 + Math.floor(rng() * 3); // 2~4 列
  const columns = Array.from({ length: cols }, () => 1 + Math.floor(rng() * 4)); // 每列 1~4
  const answer = columns.reduce((a, b) => a + b, 0);
  const distractors = sampleInts(answer, 3, rng);
  const options = shuffle([answer, ...distractors], rng);
  return { columns, answer, options };
}

// ---------------------------------------------------------------------------
// 找对称：给定图形是否对称，问「它是对称的吗？」点 是/否
// ---------------------------------------------------------------------------

export interface SymmetryQuestion {
  shapeId: ShapeId;
  shapeName: string;
  prompt: string;
  options: string[];
  answer: string;
}

export function makeSymmetryQuestion(rng: () => number = Math.random): SymmetryQuestion {
  const shape = pick(ALL_SHAPES, rng);
  const options = shuffle(['是', '否'], rng);
  return {
    shapeId: shape.id,
    shapeName: shape.name,
    prompt: `${shape.name}是对称的吗？`,
    options,
    answer: shape.symmetric ? '是' : '否',
  };
}

// ---------------------------------------------------------------------------
// 角分类：给出直角/锐角/钝角，问是什么角
// ---------------------------------------------------------------------------

export type AngleKind = 'right' | 'acute' | 'obtuse';

export interface AngleInfo {
  kind: AngleKind;
  name: string;
  /** 绘制用：两射线之间的夹角（度） */
  degrees: number;
}

export const ANGLE_INFO: Record<AngleKind, AngleInfo> = {
  right: { kind: 'right', name: '直角', degrees: 90 },
  acute: { kind: 'acute', name: '锐角', degrees: 45 },
  obtuse: { kind: 'obtuse', name: '钝角', degrees: 135 },
};

export interface AngleQuestion {
  kind: AngleKind;
  prompt: string;
  options: string[];
  answer: string;
}

export function makeAngleQuestion(rng: () => number = Math.random): AngleQuestion {
  const kinds: AngleKind[] = ['right', 'acute', 'obtuse'];
  const kind = pick(kinds, rng);
  const options = shuffle(kinds.map((k) => ANGLE_INFO[k].name), rng);
  return {
    kind,
    prompt: '这是什么角？',
    options,
    answer: ANGLE_INFO[kind].name,
  };
}
