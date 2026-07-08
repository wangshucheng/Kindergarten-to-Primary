/**
 * 速算擂台（SpeedDrill）纯逻辑层。
 * 与 React 解耦，便于单测；关联 content/multiplication-table.md 第二节「逐行速算小技巧」。
 *
 * 知识点来源（逐字抄录）：content/multiplication-table.md 第二节速算表（multiplier 1..10 共 10 条）
 *   ×1  任何数乘 1 都不变（原数） | 7×1=7
 *   ×2  加倍：把这个数加上它自己 | 6×2=6+6=12
 *   ×3  先×2 再加一次原数（或连续加 3 次） | 4×3=4×2+4=12
 *   ×4  加倍再加倍（先×2，结果再×2） | 5×4=10×2=20
 *   ×5  结果末位是 0 或 5；也可想"半个十"（双数×5=该数÷2再添0） | 8×5=40；6×5=30
 *   ×6  想成 ×5 再加一次原数 | 7×6=35+7=42
 *   ×7  想成 ×5 加 ×2（或记 7 的节奏） | 8×7=40+16=56
 *   ×8  想成 ×4 再加倍；或"缺二法"：10×该数−2×该数 | 8×8=64；9×8=90−18=72
 *   ×9  手指法：弯下第 n 根指，左边十位右边个位；也等于"10减1"法 | 9×4→左3右6=36；9×6=60−6=54
 *   ×10 直接在原数后面添一个 0（拓展） | 9×10=90
 */

/** 单条速算技巧 */
export interface SpeedTrick {
  multiplier: number;
  trick: string;
  example: string;
}

/** 速算技巧表：multiplier 1..10 全覆盖 */
export const SPEED_TRICKS: SpeedTrick[] = [
  { multiplier: 1, trick: '任何数乘 1 都不变（原数）', example: '7×1=7' },
  { multiplier: 2, trick: '加倍：把这个数加上它自己', example: '6×2=6+6=12' },
  { multiplier: 3, trick: '先×2 再加一次原数（或连续加 3 次）', example: '4×3=4×2+4=12' },
  { multiplier: 4, trick: '加倍再加倍（先×2，结果再×2）', example: '5×4=10×2=20' },
  {
    multiplier: 5,
    trick: '结果末位是 0 或 5；也可想"半个十"（双数×5=该数÷2再添0）',
    example: '8×5=40；6×5=30',
  },
  { multiplier: 6, trick: '想成 ×5 再加一次原数', example: '7×6=35+7=42' },
  { multiplier: 7, trick: '想成 ×5 加 ×2（或记 7 的节奏）', example: '8×7=40+16=56' },
  {
    multiplier: 8,
    trick: '想成 ×4 再加倍；或"缺二法"：10×该数−2×该数',
    example: '8×8=64；9×8=90−18=72',
  },
  {
    multiplier: 9,
    trick: '手指法：弯下第 n 根指，左边十位右边个位；也等于"10减1"法',
    example: '9×4：弯第4指→左3右6=36；9×6=60−6=54',
  },
  { multiplier: 10, trick: '直接在原数后面添一个 0（拓展）', example: '9×10=90' },
];

const TRICK_BY_MULTIPLIER = new Map<number, SpeedTrick>(
  SPEED_TRICKS.map((t) => [t.multiplier, t]),
);

/** 单道速算题：因子、正确答案、聚焦乘数、对应技巧、4 个唯一选项（含正确答案，已洗牌） */
export interface SpeedQuestion {
  a: number;
  b: number;
  answer: number;
  focusMultiplier: number;
  trick: SpeedTrick;
  options: number[];
}

const MIN_FACTOR = 1;
const MAX_FACTOR = 9;
// 乘积范围：a∈1..9，b∈1..10，故 1..90
const MIN_PRODUCT = 1;
const MAX_PRODUCT = MAX_FACTOR * 10; // 90

/**
 * 洗牌（Fisher–Yates），使用注入的 rng 以保证可测与可复现。
 */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 生成 3 个干扰项：优先取与正确答案接近（±9 内）且互不相同的合理值（1..90），
 * 越界或与正确答案/已选项重复则跳过；若就近不足 3 个，回退到从小到大的剩余值补齐。
 */
function pickDistractors(answer: number, count: number, rng: () => number): number[] {
  const used = new Set<number>([answer]);
  const result: number[] = [];
  let attempts = 0;

  while (result.length < count && attempts < 300) {
    attempts += 1;
    const offset = Math.floor(rng() * 19) - 9; // -9 .. +9
    const cand = answer + offset;
    if (cand < MIN_PRODUCT || cand > MAX_PRODUCT) continue;
    if (used.has(cand)) continue;
    used.add(cand);
    result.push(cand);
  }

  // 回退补齐（极端边界情形，如 answer=1 / answer=90 就近值不足）
  for (let cand = MIN_PRODUCT; cand <= MAX_PRODUCT && result.length < count; cand++) {
    if (used.has(cand)) continue;
    used.add(cand);
    result.push(cand);
  }

  return result;
}

/**
 * makeSpeedQuestion —— 随机生成一道速算题与 4 个选项，关联对应乘数的速算技巧。
 * @param rng 随机数源，默认 Math.random（可注入以单测/复现）。
 */
export function makeSpeedQuestion(rng: () => number = Math.random): SpeedQuestion {
  const a = MIN_FACTOR + Math.floor(rng() * MAX_FACTOR); // 1..9
  // b ∈ 1..10，但 10 低概率（约 15%）；否则 1..9
  const b = rng() < 0.15 ? 10 : MIN_FACTOR + Math.floor(rng() * MAX_FACTOR);
  const answer = a * b;
  const focusMultiplier = b;
  const trick = TRICK_BY_MULTIPLIER.get(b)!;
  const distractors = pickDistractors(answer, 3, rng);
  const options = shuffle([answer, ...distractors], rng);
  return { a, b, answer, focusMultiplier, trick, options };
}

/** 题目朗读文本（如「7 乘 8 等于几」） */
export function speedPromptText(a: number, b: number): string {
  return `${a} 乘 ${b} 等于几`;
}
