/**
 * mathGenerator —— 数学题生成器。
 * - genExpression：按规则生成 10 以内加、20 以内进位加(凑十)、20 以内退位减(破十)、
 *   连加连减混合；答案/范围/结构正确，可单测。
 * - genLogic：生成 排序 / 分类 / 规律 / 推理 题面。
 * 规则来自 loadMathContent().addSubtract / .logic，缺失时回退内置 FALLBACK。
 */
import type { MathContent, AddSubtractRule } from '../types';
import { loadMathContent } from '../loader';
import { createRng, randomInt } from '../../utils/rng';
import { shuffle, pick } from '../../utils/shuffle';

export interface MathExpr {
  text: string;
  answer: number;
  hint?: string;
  strategy?: string;
  knowledgePoint: string;
}

export interface LogicPuzzle {
  kind: 'sort' | 'classify' | 'pattern' | 'reason';
  items: { id: string; label: string; group?: string }[];
  target: unknown;
  knowledgePoint: string;
}

const FALLBACK: Record<string, AddSubtractRule> = {
  within10: { ops: ['+'], max: 10, strategies: [], hint: '十以内加法' },
  carry20: { ops: ['+'], max: 20, strategies: ['make-ten'], hint: '凑十法' },
  borrow20: { ops: ['-'], max: 20, strategies: ['break-ten'], hint: '破十法' },
  mixedChain: { ops: ['+', '-'], terms: 3, max: 20, strategies: ['chain'], hint: '连加连减' },
};

function ruleForLevel(level: 1 | 2 | 3): string {
  return level === 1 ? 'within10' : level === 2 ? 'carry20' : 'borrow20';
}

interface ExprCore {
  text: string;
  answer: number;
  strategy?: string;
  hint?: string;
}

/** 10 以内加法：a + b <= 10 */
function genWithin10(rng: () => number, rule: AddSubtractRule): ExprCore {
  const a = randomInt(rng, 1, 9);
  const b = randomInt(rng, 1, 10 - a);
  return { text: `${a}+${b}`, answer: a + b };
}

/** 20 以内进位加（凑十）：a + b，和 > 10，携带凑十提示 */
function genCarry20(rng: () => number, rule: AddSubtractRule): ExprCore {
  const a = randomInt(rng, 2, 9);
  const b = randomInt(rng, 11 - a, 9); // 保证 a+b ∈ [11, 18]
  const answer = a + b;
  const first = 10 - a;
  const second = answer - 10;
  const hint = `凑十法：${a}+${first}=10，10+${second}=${answer}`;
  return { text: `${a}+${b}`, answer, strategy: 'make-ten', hint };
}

/**
 * 20 以内退位减（破十）：a - b，需借位，携带破十提示。
 * 关键约束：退位减要求「被减数个位 < 减数个位」（整十时个位为 0 亦满足）。
 * 当 a%10 === 9（即 a=19）时，个位数已是最大，无法再用个位数 b 借位，
 * 原实现 randomInt(rng, 10, 9) 因 min>max 退化为恒返回 10，生成了 19-10 这类
 * 非退位、且减数越界的非法式。
 * 修复：被减数个位 aOnes 取 1~8（彻底避开 a%10===9 的退化分支），a=10+aOnes∈[11,18]；
 * 减数 b 在 [aOnes+1, 9] 取（保证 b>aOnes 且为个位数），则 a%10<b%10 必借位，
 * r=a-b 自然落在 [2,9] 且为真实退位减。整十 a=20 单独处理（个位 0<b 必借位，结果 11~19）。
 */
function genBorrow20(rng: () => number, rule: AddSubtractRule): ExprCore {
  const mode = randomInt(rng, 1, 9); // 1..8 → 11..18；9 → 20（整十单独分支）
  let a: number;
  let b: number;
  if (mode === 9) {
    a = 20;
    b = randomInt(rng, 1, 9); // 个位 0 < b，必借位，结果 20-b ∈ [11,19]
  } else {
    const aOnes = mode; // 1..8，杜绝 a%10===9 的退化
    a = 10 + aOnes; // 11..18
    b = randomInt(rng, aOnes + 1, 9); // b > aOnes 且为个位数 → 必借位
  }
  const answer = a - b;
  const tens = a - 10;
  const hint = `破十法：${a}=10+${tens}，先算 10-${b}=${10 - b}，再算 ${10 - b}+${tens}=${answer}`;
  return { text: `${a}-${b}`, answer, strategy: 'break-ten', hint };
}

/** 连加连减混合：三项运算，结果落在 [0, max] */
function genMixedChain(rng: () => number, rule: AddSubtractRule): ExprCore {
  const max = rule.max;
  for (let attempt = 0; attempt < 100; attempt++) {
    const a = randomInt(rng, 1, Math.min(10, max));
    const op1 = pick(rule.ops, rng);
    let b = randomInt(rng, 1, Math.min(10, max));
    if (op1 === '-' && a < b) b = randomInt(rng, 1, a);
    const partial = op1 === '+' ? a + b : a - b;
    const op2 = pick(rule.ops, rng);
    let c = randomInt(rng, 1, Math.min(10, max));
    if (op2 === '-' && partial < c) c = randomInt(rng, 1, Math.max(1, partial));
    const answer = op2 === '+' ? partial + c : partial - c;
    if (partial >= 0 && answer >= 0 && answer <= max) {
      return { text: `${a}${op1}${b}${op2}${c}`, answer, strategy: 'chain', hint: rule.hint };
    }
  }
  return { text: '5+3-2', answer: 6, strategy: 'chain', hint: rule.hint };
}

export function genExpression(opts: {
  level: 1 | 2 | 3;
  rule?: string;
  seed?: number;
}): MathExpr {
  const rng = createRng(opts.seed ?? Date.now());
  const content: MathContent = loadMathContent();
  const ruleName = opts.rule ?? ruleForLevel(opts.level);
  const rule: AddSubtractRule =
    (content.addSubtract && content.addSubtract[ruleName]) || FALLBACK[ruleName];

  let core: ExprCore;
  switch (ruleName) {
    case 'carry20':
      core = genCarry20(rng, rule);
      break;
    case 'borrow20':
      core = genBorrow20(rng, rule);
      break;
    case 'mixedChain':
      core = genMixedChain(rng, rule);
      break;
    case 'within10':
    default:
      core = genWithin10(rng, rule);
      break;
  }

  return {
    text: core.text,
    answer: core.answer,
    strategy: core.strategy,
    hint: core.hint,
    knowledgePoint: `math:${ruleName}`,
  };
}

/**
 * 反推算式：生成一道答案恰好等于 `target` 的 20 以内加减式。
 *
 * 用于数字扫雷「周围雷数 = 算式答案」的推理机制（M1）：每格先算出真实邻居雷数
 * `neighborMines ∈ [0,8]`，再据此生成一道同值算式，使「算出答案即知雷数」成立。
 * - target 为 0/1：10 以内减法（如 `1-1`、`2-1`）。
 * - target ∈ [2,8]：L1 用 10 以内加法（如 `3+4`）；L2/L3 用退位减(破十)（如 `12-9`）以制造区分度。
 * 所有结果均落在 [0,8]，符合「20 以内加减」且答案恒等于 target。
 */
export function genExpressionForTarget(opts: {
  target: number;
  level: 1 | 2 | 3;
  seed?: number;
}): MathExpr {
  const rng = createRng(opts.seed ?? Date.now());
  const target = Math.max(0, Math.min(8, opts.target)); // 邻居雷数上限为 8

  if (target <= 1) {
    const b = target === 0 ? 1 : randomInt(rng, 2, 9);
    const a = b - target; // a-b = target
    return {
      text: `${b}-${a}`,
      answer: target,
      strategy: 'within-ten',
      hint: '10 以内减法',
      knowledgePoint: 'math:within10',
    };
  }

  if (opts.level >= 2) {
    // 退位减(破十)：a - b = target，其中 a = 10 + aOnes，b = 10 + aOnes - target
    const aOnes = randomInt(rng, 1, target - 1); // 1..target-1
    const a = 10 + aOnes;
    const b = 10 + aOnes - target;
    const tens = a - 10;
    return {
      text: `${a}-${b}`,
      answer: target,
      strategy: 'break-ten',
      hint: `破十法：${a}=10+${tens}，先算 10-${b}=${10 - b}，再算 ${10 - b}+${tens}=${target}`,
      knowledgePoint: 'math:borrow20',
    };
  }

  const a = randomInt(rng, 1, target - 1);
  const b = target - a; // a+b = target
  return {
    text: `${a}+${b}`,
    answer: target,
    strategy: 'within-ten',
    hint: '10 以内加法',
    knowledgePoint: 'math:within10',
  };
}

// ---------------- 逻辑题 ----------------

interface SortItem {
  id: string;
  label: string;
  sortKey: number;
}

/** 6 档尺寸，供「按大小排序」维度使用（L3 需要 count=6 个不同项） */
const SIZES = [
  { l: '极小', k: 1 },
  { l: '小', k: 2 },
  { l: '中', k: 3 },
  { l: '大', k: 4 },
  { l: '极大', k: 5 },
  { l: '超大', k: 6 },
];

function genSort(rng: () => number, level: 1 | 2 | 3, content: MathContent): LogicPuzzle {
  // M7：L3 使用「按大小排序」维度（size 分支），修复死代码并落实 PRD「按大小排序」
  const type = (level === 1 ? 'number' : level === 2 ? 'letter' : 'size') as string;
  const order = (level === 1 ? 'asc' : level === 2 ? 'asc' : 'desc') as string;
  const count = 3 + level; // L1:4, L2:5, L3:6

  let values: SortItem[] = [];
  if (type === 'letter') {
    const letters = shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), rng).slice(0, count);
    values = letters.map((l, i) => ({ id: `l${i}`, label: l, sortKey: l.charCodeAt(0) }));
  } else if (type === 'size') {
    // M7：按大小排序，用 SIZES 全量打乱取 count 项（L3 取满 6 档）
    const sizes = shuffle(SIZES, rng).slice(0, count);
    values = sizes.map((s, i) => ({ id: `s${i}`, label: s.l, sortKey: s.k }));
  } else {
    const nums = shuffle(
      Array.from({ length: 20 }, (_, i) => i + 1),
      rng,
    ).slice(0, count);
    values = nums.map((n, i) => ({ id: `n${i}`, label: String(n), sortKey: n }));
  }

  const shuffled = shuffle(values, rng);
  const sorted = [...values].sort((a, b) =>
    order === 'asc' ? a.sortKey - b.sortKey : b.sortKey - a.sortKey,
  );
  const items = shuffled.map((v) => ({ id: v.id, label: v.label }));
  const target = { type, order, sortedIds: sorted.map((s) => s.id) };
  return { kind: 'sort', items, target, knowledgePoint: 'logic:sort' };
}

function genClassify(rng: () => number, content: MathContent): LogicPuzzle {
  const examples = (content.logic.classify.examples ?? []) as {
    id: string;
    label: string;
    emoji?: string;
    group: string;
  }[];
  const chosen = shuffle(examples, rng).slice(0, Math.min(6, examples.length));
  const items = chosen.map((e) => ({ id: e.id, label: e.label, group: e.group }));
  const groups: Record<string, string[]> = {};
  for (const e of chosen) {
    (groups[e.group] = groups[e.group] ?? []).push(e.id);
  }
  const target = { dimension: content.logic.classify.dimensions[0]?.key ?? 'fly', groups };
  return { kind: 'classify', items, target, knowledgePoint: 'logic:classify' };
}

function genPattern(rng: () => number, level: 1 | 2 | 3, content: MathContent): LogicPuzzle {
  const shapes = content.logic.pattern.shapes;
  const rules = content.logic.pattern.rules;
  const rule = pick(rules, rng);
  const len = 4 + level; // L1:5, L2:6, L3:7
  const seq: string[] = [];
  for (let i = 0; i < len; i++) {
    if (rule === 'AAB') {
      seq.push(i % 3 === 2 ? shapes[1] : shapes[0]);
    } else {
      // AB / ABAB 均为奇偶交替
      seq.push(i % 2 === 0 ? shapes[0] : shapes[1]);
    }
  }
  const gapIdx = randomInt(rng, 0, len - 1);
  const missing = seq[gapIdx];
  const items = seq.map((s, i) => ({ id: `c${i}`, label: i === gapIdx ? '?' : s }));
  const target = { rule, gapIndex: gapIdx, missingLabel: missing, options: shapes };
  return { kind: 'pattern', items, target, knowledgePoint: 'logic:pattern' };
}

export function genLogic(opts: { kind: string; level: 1 | 2 | 3; seed?: number }): LogicPuzzle {
  const rng = createRng(opts.seed ?? Date.now());
  const content: MathContent = loadMathContent();
  switch (opts.kind) {
    case 'classify':
      return genClassify(rng, content);
    case 'pattern':
      return genPattern(rng, opts.level, content);
    case 'sort':
    default:
      return genSort(rng, opts.level, content);
  }
}
