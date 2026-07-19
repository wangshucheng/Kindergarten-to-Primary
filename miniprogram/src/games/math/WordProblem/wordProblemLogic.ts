/**
 * 应用题闯关（WordProblem）纯逻辑层。
 * 与 React 解耦，便于单测；关联 content/multiplication-table.md 第三节「常见应用题」。
 *
 * 知识点来源（逐字抄录，含答案）：content/multiplication-table.md 第三节 + 答案
 *   1. 小明每天写 3 行字，写了 6 天，一共写了多少行？           3×6=18（行）
 *   2. 一盒铅笔有 8 支，买 5 盒一共有多少支？                    8×5=40（支）
 *   3. 操场上一排有 7 棵树，这样的 4 排一共有多少棵？            7×4=28（棵）
 *   4. 一本书 9 元，买 3 本需要多少元？                         9×3=27（元）
 *   5. 每组 6 人做游戏，9 组一共有多少人？                      6×9=54（人）
 *   6. 一个书包 7 元，妈妈买了 8 个，付 80 元够吗？             7×8=56（元），56<80，够
 *   7. 每包糖有 10 颗（拓展×10），4 包一共有多少颗？            10×4=40（颗）
 *   8. 小红有 2 盘苹果，每盘 9 个，送给同学 5 个，还剩几个？     2×9=18（个），18−5=13（个）
 */

/** 单道应用题（含算式与答案，来自 content 文档） */
export interface WordProblem {
  id: number;
  stem: string;
  equation: string;
  /** 单位（来自答案括号，如「行」「支」） */
  unit: string;
  answer: number;
  /** 备注（如第 6 题「56<80，够」），可选 */
  note?: string;
}

/** 应用题题库：恰好 8 条，逐字来自 content 文档 */
export const WORD_PROBLEMS: WordProblem[] = [
  { id: 1, stem: '小明每天写 3 行字，写了 6 天，一共写了多少行？', equation: '3×6', answer: 18, unit: '行' },
  { id: 2, stem: '一盒铅笔有 8 支，买 5 盒一共有多少支？', equation: '8×5', answer: 40, unit: '支' },
  { id: 3, stem: '操场上一排有 7 棵树，这样的 4 排一共有多少棵？', equation: '7×4', answer: 28, unit: '棵' },
  { id: 4, stem: '一本书 9 元，买 3 本需要多少元？', equation: '9×3', answer: 27, unit: '元' },
  { id: 5, stem: '每组 6 人做活动，9 组一共有多少人？', equation: '6×9', answer: 54, unit: '人' },
  {
    id: 6,
    stem: '一个书包 7 元，妈妈买了 8 个，付 80 元够吗？',
    equation: '7×8',
    answer: 56,
    unit: '元',
    note: '56<80，够',
  },
  { id: 7, stem: '每包糖有 10 颗（拓展×10），4 包一共有多少颗？', equation: '10×4', answer: 40, unit: '颗' },
  {
    id: 8,
    stem: '小红有 2 盘苹果，每盘 9 个，送给同学 5 个，还剩几个？',
    equation: '2×9-5',
    answer: 13,
    unit: '个',
  },
];

/** 单道应用题选择题：题干、算式、单位、正确答案、4 个唯一选项（含正确答案，已洗牌） */
export interface WordProblemQuestion {
  id: number;
  stem: string;
  equation: string;
  unit: string;
  answer: number;
  options: number[];
}

const MIN_PRODUCT = 1;
const MAX_PRODUCT = 90;

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
 * makeWordProblem —— 随机取 1 题生成选择题与 4 个选项。
 * 干扰项优先取其他 7 题的 answer（天然合理且与本答案不同），
 * 不足 3 个时回退到就近整数（±9，1..90）补齐；保证含 answer 且唯一。
 * @param rng 随机数源，默认 Math.random（可注入以单测/复现）。
 */
export function makeWordProblem(rng: () => number = Math.random): WordProblemQuestion {
  const pool = WORD_PROBLEMS.slice();
  // 用 rng 随机选一题（Fisher–Yates 抽一张，避免额外依赖）
  const pickIdx = Math.floor(rng() * pool.length);
  const chosen = pool[pickIdx];

  const used = new Set<number>([chosen.answer]);
  const distractors: number[] = [];

  // 候选干扰：其他 7 题的 answer
  const otherAnswers = pool.filter((p) => p.id !== chosen.id).map((p) => p.answer);
  // 打乱候选
  const shuffledOthers = shuffle(otherAnswers, rng);
  for (const cand of shuffledOthers) {
    if (distractors.length >= 3) break;
    if (used.has(cand)) continue;
    used.add(cand);
    distractors.push(cand);
  }

  // 不足 3 个：回退就近整数（±9，1..90）
  let attempts = 0;
  while (distractors.length < 3 && attempts < 300) {
    attempts += 1;
    const offset = Math.floor(rng() * 19) - 9; // -9 .. +9
    const cand = chosen.answer + offset;
    if (cand < MIN_PRODUCT || cand > MAX_PRODUCT) continue;
    if (used.has(cand)) continue;
    used.add(cand);
    distractors.push(cand);
  }

  // 极端兜底：从小到大补齐
  for (let cand = MIN_PRODUCT; cand <= MAX_PRODUCT && distractors.length < 3; cand++) {
    if (used.has(cand)) continue;
    used.add(cand);
    distractors.push(cand);
  }

  const options = shuffle([chosen.answer, ...distractors], rng);
  return {
    id: chosen.id,
    stem: chosen.stem,
    equation: chosen.equation,
    unit: chosen.unit,
    answer: chosen.answer,
    options,
  };
}
