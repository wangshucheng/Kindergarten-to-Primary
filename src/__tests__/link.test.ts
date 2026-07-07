import { describe, it, expect } from 'vitest';
import {
  generateRound,
  type LinkLevel,
} from '../games/math/PlusMinusLink/linkLogic';

function evalEq(label: string): number {
  const m = label.match(/^(\d+)([+\-])(\d+)$/);
  if (!m) throw new Error('unexpected equation label: ' + label);
  const a = Number(m[1]);
  const b = Number(m[3]);
  return m[2] === '+' ? a + b : a - b;
}

describe('PlusMinusLink 连连看逻辑', () => {
  const level: LinkLevel = { count: 6, ops: ['+', '-'], max: 20 };

  it('generateRound：数量正确', () => {
    const r = generateRound(level, 11);
    expect(r.items.length).toBe(level.count * 2);
    expect(r.equations.length).toBe(level.count);
    expect(r.answers.length).toBe(level.count);
    expect(r.total).toBe(level.count);
  });

  it('generateRound：每对 算式==答案 且 pairKey 一致', () => {
    const r = generateRound(level, 22);
    // equations 与 answers 各自独立洗牌，须按 pairKey 配对校验
    const ansByKey = new Map(r.answers.map((a) => [a.pairKey, a]));
    for (const eq of r.equations) {
      const ans = ansByKey.get(eq.pairKey)!;
      expect(ans).toBeDefined();
      expect(eq.kind).toBe('eq');
      expect(ans.kind).toBe('ans');
      expect(evalEq(eq.label)).toBe(Number(ans.label));
    }
  });

  it('generateRound：items 包含全部算式与答案', () => {
    const r = generateRound(level, 33);
    const eqIds = new Set(r.equations.map((e) => e.id));
    const ansIds = new Set(r.answers.map((a) => a.id));
    for (const it of r.items) {
      expect(eqIds.has(it.id) || ansIds.has(it.id)).toBe(true);
    }
  });

  it('generateRound：减法结果非负', () => {
    const r = generateRound({ count: 20, ops: ['-'], max: 15 }, 44);
    for (const a of r.answers) {
      expect(Number(a.label)).toBeGreaterThanOrEqual(0);
    }
  });

  it('generateRound：同种子可复现', () => {
    const a = generateRound(level, 77);
    const b = generateRound(level, 77);
    expect(a.items).toEqual(b.items);
  });
});
