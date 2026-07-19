/**
 * 乘法口诀（1–9 乘法表）纯逻辑层。
 * 与 React 解耦，便于单测；范围严格限定在 a,b ∈ 1..9，乘积 ∈ 1..81。
 */

/** 单个练习题：因子、正确答案与 4 个唯一选项（含正确答案，已洗牌） */
export interface MultiplicationQuestion {
  a: number;
  b: number;
  answer: number;
  options: number[];
}

/** 口诀表单元格 */
export interface TableCell {
  a: number;
  b: number;
  product: number;
}

const MIN_FACTOR = 1;
const MAX_FACTOR = 9;
const MAX_PRODUCT = MAX_FACTOR * MAX_FACTOR; // 81

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
 * 生成 3 个干扰项：优先取与正确答案接近（±9 内）且互不相同的合理值（1..81），
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
    if (cand < MIN_FACTOR || cand > MAX_PRODUCT) continue;
    if (used.has(cand)) continue;
    used.add(cand);
    result.push(cand);
  }

  // 回退补齐（极端边界情形，如 answer=1 / answer=81 就近值不足）
  for (let cand = MIN_FACTOR; cand <= MAX_PRODUCT && result.length < count; cand++) {
    if (used.has(cand)) continue;
    used.add(cand);
    result.push(cand);
  }

  return result;
}

/**
 * makeQuestion —— 随机生成一道题与 4 个选项。
 * @param rng 随机数源，默认 Math.random（可注入以单测/复现）。
 */
export function makeQuestion(rng: () => number = Math.random): MultiplicationQuestion {
  const a = MIN_FACTOR + Math.floor(rng() * MAX_FACTOR);
  const b = MIN_FACTOR + Math.floor(rng() * MAX_FACTOR);
  const answer = a * b;
  const distractors = pickDistractors(answer, 3, rng);
  const options = shuffle([answer, ...distractors], rng);
  return { a, b, answer, options };
}

/**
 * buildTable —— 生成 9×9 乘法口诀表数据（行 a=1..9，列 b=1..9）。
 */
export function buildTable(): TableCell[][] {
  const rows: TableCell[][] = [];
  for (let a = MIN_FACTOR; a <= MAX_FACTOR; a++) {
    const row: TableCell[] = [];
    for (let b = MIN_FACTOR; b <= MAX_FACTOR; b++) {
      row.push({ a, b, product: a * b });
    }
    rows.push(row);
  }
  return rows;
}

/** 口诀朗读文本（如「3 乘 4 等于 12」） */
export function rhymeText(a: number, b: number): string {
  return `${a} 乘 ${b} 等于 ${a * b}`;
}

/** 题目朗读文本（如「3 乘 4 等于几」） */
export function promptText(a: number, b: number): string {
  return `${a} 乘 ${b} 等于几`;
}
