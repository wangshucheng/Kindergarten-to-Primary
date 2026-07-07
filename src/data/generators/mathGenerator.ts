/**
 * mathGenerator —— 数学题生成器。
 * - genExpression：按规则生成 10 以内加、20 以内进位加(凑十)、20 以内退位减(破十)、
 *   连加连减混合；答案/范围/结构正确，可单测。
 * - genLogic：生成 排序 / 分类 / 规律 / 推理 题面。
 * 规则来自 loadMathContent().addSubtract / .logic，缺失时回退内置 FALLBACK。
 */
import type { MathContent, AddSubtractRule, GenOpts } from '../types';
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

/** 20 以内退位减（破十）：a - b，需借位，携带破十提示 */
function genBorrow20(rng: () => number, rule: AddSubtractRule): ExprCore {
  const a = randomInt(rng, 11, 20);
  let b: number;
  if (a % 10 === 0) {
    b = randomInt(rng, 1, Math.min(9, a - 1));
  } else {
    const aOnes = a % 10;
    const bOnes = randomInt(rng, aOnes + 1, 9); // b 个位 > a 个位 → 必借位
    b = bOnes; // bOnes <= 9 < a(>=11)
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

// ---------------- 逻辑题 ----------------

interface SortItem {
  id: string;
  label: string;
  sortKey: number;
}

function genSort(rng: () => number, level: 1 | 2 | 3, content: MathContent): LogicPuzzle {
  const type = (level === 1 ? 'number' : level === 2 ? 'letter' : 'number') as string;
  const order = (level === 1 ? 'asc' : level === 2 ? 'asc' : 'desc') as string;
  const count = 3 + level; // L1:4, L2:5, L3:6

  let values: SortItem[] = [];
  if (type === 'letter') {
    const letters = shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), rng).slice(0, count);
    values = letters.map((l, i) => ({ id: `l${i}`, label: l, sortKey: l.charCodeAt(0) }));
  } else if (type === 'size') {
    const sizes = shuffle(
      [
        { l: '小', k: 1 },
        { l: '中', k: 2 },
        { l: '大', k: 3 },
      ],
      rng,
    ).slice(0, Math.min(count, 3));
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

function genReason(rng: () => number, level: 1 | 2 | 3, content: MathContent): LogicPuzzle {
  const gridSize = Math.max(2, content.logic.reason.gridSize + (level - 1));
  const shapes = content.logic.pattern.shapes;
  const cols: string[][] = [];
  for (let c = 0; c < gridSize; c++) {
    const shape = pick(shapes, rng);
    cols.push(Array.from({ length: gridSize }, () => shape));
  }
  const gapR = randomInt(rng, 0, gridSize - 1);
  const gapC = randomInt(rng, 0, gridSize - 1);
  const missing = cols[gapC][gapR];
  const items: { id: string; label: string }[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      items.push({ id: `r${r}c${c}`, label: r === gapR && c === gapC ? '?' : cols[c][r] });
    }
  }
  const target = {
    gridSize,
    gapId: `r${gapR}c${gapC}`,
    missingLabel: missing,
    rule: 'column-consistent',
  };
  return { kind: 'reason', items, target, knowledgePoint: 'logic:reason' };
}

export function genLogic(opts: { kind: string; level: 1 | 2 | 3; seed?: number }): LogicPuzzle {
  const rng = createRng(opts.seed ?? Date.now());
  const content: MathContent = loadMathContent();
  switch (opts.kind) {
    case 'classify':
      return genClassify(rng, content);
    case 'pattern':
      return genPattern(rng, opts.level, content);
    case 'reason':
      return genReason(rng, opts.level, content);
    case 'sort':
    default:
      return genSort(rng, opts.level, content);
  }
}

/** 兼容 GenOpts 的便捷封装（供门面统一调用） */
export function genMath(opts: GenOpts): MathExpr {
  return genExpression({ level: opts.level, rule: opts.mode, seed: opts.seed });
}
