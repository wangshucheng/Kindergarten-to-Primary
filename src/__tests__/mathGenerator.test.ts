/**
 * mathGenerator 测试（node 环境）。
 * 验证四则算式（10 以内加 / 20 以内进位加 / 20 以内退位减 / 连加连减混合）
 * 的结构正确性与答案正确性，以及逻辑题（排序 / 分类 / 规律 / 推理）的不变量。
 */
import { describe, expect, it } from 'vitest';
import { genExpression, genLogic } from '../data/generators/mathGenerator';

/** 左到右求值（仅 + / -，无优先级） */
function evalExpr(text: string): number {
  const tokens = text.match(/(\d+|[+\-])/g);
  if (!tokens) throw new Error(`无法解析算式: ${text}`);
  let acc = parseInt(tokens[0], 10);
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const n = parseInt(tokens[i + 1], 10);
    acc = op === '+' ? acc + n : acc - n;
  }
  return acc;
}

type ExprOpts = { level: 1 | 2 | 3; rule?: string; seed?: number };
type LogicOpts = { kind: string; level: 1 | 2 | 3; seed?: number };

describe('genExpression · within10', () => {
  it('a+b<=10 且答案正确', () => {
    for (const seed of [11, 12, 13, 14, 15]) {
      const o: ExprOpts = { level: 1, rule: 'within10', seed };
      const e = genExpression(o);
      expect(e.text).toMatch(/^\d+\+\d+$/);
      const [a, b] = e.text.split('+').map(Number);
      expect(a + b).toBeLessThanOrEqual(10);
      expect(e.answer).toBe(a + b);
      expect(evalExpr(e.text)).toBe(e.answer);
    }
  });
});

describe('genExpression · carry20（凑十法）', () => {
  it('和 > 10 且需进位，答案为两数之和', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const o: ExprOpts = { level: 2, rule: 'carry20', seed };
      const e = genExpression(o);
      const [a, b] = e.text.split('+').map(Number);
      expect(a + b).toBeGreaterThan(10);
      expect(e.answer).toBe(a + b);
      expect(e.strategy).toBe('make-ten');
      expect(evalExpr(e.text)).toBe(e.answer);
    }
  });
});

describe('genExpression · borrow20（破十法）', () => {
  it('需退位（个位不够减），答案为两数之差', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const o: ExprOpts = { level: 3, rule: 'borrow20', seed };
      const e = genExpression(o);
      const [a, b] = e.text.split('-').map(Number);
      expect(a).toBeGreaterThanOrEqual(11);
      expect(a % 10).toBeLessThan(b % 10); // 个位不够减 → 必借位
      expect(e.answer).toBe(a - b);
      expect(e.strategy).toBe('break-ten');
      expect(evalExpr(e.text)).toBe(e.answer);
    }
  });
});

describe('genExpression · mixedChain（连加连减）', () => {
  it('结果落在 [0, 20]，答案正确', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const o: ExprOpts = { level: 2, rule: 'mixedChain', seed };
      const e = genExpression(o);
      expect(e.answer).toBeGreaterThanOrEqual(0);
      expect(e.answer).toBeLessThanOrEqual(20);
      expect(evalExpr(e.text)).toBe(e.answer);
      expect(e.strategy).toBe('chain');
    }
  });
});

describe('genExpression · 可复现性', () => {
  it('同种子产出相同算式', () => {
    const a = genExpression({ level: 2, rule: 'carry20', seed: 9 });
    const b = genExpression({ level: 2, rule: 'carry20', seed: 9 });
    expect(a.text).toBe(b.text);
  });
});

describe('genLogic · sort', () => {
  it('题项数 = 3 + level，sortedIds 为全部 id 的排列', () => {
    for (const level of [1, 2, 3] as const) {
      const o: LogicOpts = { kind: 'sort', level, seed: 21 };
      const p = genLogic(o);
      expect(p.kind).toBe('sort');
      expect(p.items.length).toBe(3 + level);
      const ids = p.items.map((i) => i.id);
      const t = p.target as { sortedIds: string[] };
      expect(new Set(t.sortedIds).size).toBe(t.sortedIds.length); // 不重复
      expect(new Set([...ids, ...t.sortedIds]).size).toBe(ids.length); // 同集合
    }
  });
});

describe('genLogic · classify', () => {
  it('items 分组覆盖全部 id', () => {
    const o: LogicOpts = { kind: 'classify', level: 1, seed: 31 };
    const p = genLogic(o);
    expect(p.kind).toBe('classify');
    const ids = p.items.map((i) => i.id);
    const t = p.target as { groups: Record<string, string[]> };
    const grouped = Object.values(t.groups).flat();
    expect(new Set(grouped).size).toBe(grouped.length); // 不重复
    expect(new Set([...ids, ...grouped]).size).toBe(ids.length); // 同集合
    expect(p.items.every((i) => typeof i.group === 'string')).toBe(true);
  });
});

describe('genLogic · pattern', () => {
  it('恰有一个空缺，长度 = 4 + level', () => {
    for (const level of [1, 2, 3] as const) {
      const o: LogicOpts = { kind: 'pattern', level, seed: 41 };
      const p = genLogic(o);
      expect(p.items.length).toBe(4 + level);
      expect(p.items.filter((i) => i.label === '?').length).toBe(1);
      const t = p.target as { missingLabel: string };
      expect(typeof t.missingLabel).toBe('string');
    }
  });
});


