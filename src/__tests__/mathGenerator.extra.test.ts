/**
 * QA 补充测试（严过关）· mathGenerator 边界与结构强化。
 * 目标：在工程师自测（答案正确/可复现）之外，补充
 *  - 边界值（上限、结果为负应被排除、零值不出现）
 *  - 算式结构（连加连减恰好 3 操作数 / 2 运算符，且中间过程不为负）
 *  - 凑十/破十 算理（借位必然发生、提示与答案自洽）
 * 不修改任何业务源码，仅新增测试。
 */
import { describe, expect, it } from 'vitest';
import { genExpression } from '../data/generators/mathGenerator';

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
/** 逐步求值并返回每一步累加值（用于校验中间不为负） */
function steps(text: string): number[] {
  const tokens = text.match(/(\d+|[+\-])/g)!;
  const accs: number[] = [parseInt(tokens[0], 10)];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const n = parseInt(tokens[i + 1], 10);
    accs.push(op === '+' ? accs[accs.length - 1] + n : accs[accs.length - 1] - n);
  }
  return accs;
}

describe('genExpression · within10 边界', () => {
  it('a∈[1,9], b∈[1,10-a]，答案=a+b，绝不出现 0 或越界', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const e = genExpression({ level: 1, rule: 'within10', seed });
      const [a, b] = e.text.split('+').map(Number);
      expect(a).toBeGreaterThanOrEqual(1);
      expect(a).toBeLessThanOrEqual(9);
      expect(b).toBeGreaterThanOrEqual(1);
      expect(b).toBeLessThanOrEqual(10 - a); // 不会越上限
      expect(e.answer).toBe(a + b);
      expect(e.answer).toBeGreaterThanOrEqual(2); // 双正整数相加必 ≥2，不存在 0
      expect(e.answer).toBeLessThanOrEqual(10);
      expect(evalExpr(e.text)).toBe(e.answer);
    }
  });
});

describe('genExpression · carry20 边界与算理', () => {
  it('和 ∈ [11,18] 必进位，且 a+b 自洽', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const e = genExpression({ level: 2, rule: 'carry20', seed });
      const [a, b] = e.text.split('+').map(Number);
      expect(a).toBeGreaterThanOrEqual(2);
      expect(a).toBeLessThanOrEqual(9);
      expect(b).toBeGreaterThanOrEqual(2);
      expect(b).toBeLessThanOrEqual(9);
      expect(e.answer).toBe(a + b);
      expect(e.answer).toBeGreaterThan(10); // 进位
      expect(e.answer).toBeLessThanOrEqual(18); // 20 以内
      expect(e.strategy).toBe('make-ten');
      expect(e.hint).toContain('凑十');
      expect(evalExpr(e.text)).toBe(e.answer);
    }
  });
});

describe('genExpression · borrow20 边界与算理（修复回归）', () => {
  it('seed 0..299 扫描：a∈[11,20]、b 为个位数、必退位、结果自洽，绝不出现 19-10 类非法式', () => {
    for (let seed = 0; seed < 300; seed++) {
      const e = genExpression({ level: 3, rule: 'borrow20', seed });
      const [a, b] = e.text.split('-').map(Number);
      // 被减数范围
      expect(a).toBeGreaterThanOrEqual(11);
      expect(a).toBeLessThanOrEqual(20);
      // 减数必为个位数（核心 Bug：原实现 a=19 时 b 退化成 10）
      expect(b).toBeGreaterThanOrEqual(1);
      expect(b).toBeLessThanOrEqual(9);
      // 必为真实退位减：整十（个位为 0）或 个位不够减
      const borrowNeeded = a % 10 === 0 || a % 10 < b % 10;
      expect(borrowNeeded).toBe(true);
      // 答案与算式一致，且为合法退位减结果（11-9=2 最小，20-1=19 最大）
      expect(e.answer).toBe(a - b);
      expect(e.answer).toBeGreaterThanOrEqual(2);
      expect(e.answer).toBeLessThanOrEqual(19);
      // 算理提示自洽
      expect(e.strategy).toBe('break-ten');
      expect(e.hint).toContain('破十');
      expect(e.hint).toContain(String(a));
      expect(e.hint).toContain(String(b));
      expect(evalExpr(e.text)).toBe(e.answer);
    }
  });
});

describe('genExpression · mixedChain 结构与范围', () => {
  it('恰好 3 操作数 / 2 运算符，结果 ∈ [0,20]，中间过程不为负', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const e = genExpression({ level: 2, rule: 'mixedChain', seed });
      const tokens = e.text.match(/(\d+|[+\-])/g)!;
      const operands = tokens.filter((t) => /^\d+$/.test(t)).length;
      const ops = tokens.filter((t) => t === '+' || t === '-').length;
      expect(operands).toBe(3);
      expect(ops).toBe(2);
      const accs = steps(e.text);
      expect(accs.every((v) => v >= 0)).toBe(true); // 每段都不为负
      expect(e.answer).toBeGreaterThanOrEqual(0);
      expect(e.answer).toBeLessThanOrEqual(20);
      expect(evalExpr(e.text)).toBe(e.answer);
      expect(e.strategy).toBe('chain');
    }
  });
});

describe('genExpression · 负结果排除（宽种子扫描）', () => {
  it('四条规则在 seed 0..199 上均无负答案且不越各自上限', () => {
    const cases: Array<{ rule: string; level: 1 | 2 | 3; max: number }> = [
      { rule: 'within10', level: 1, max: 10 },
      { rule: 'carry20', level: 2, max: 20 },
      { rule: 'borrow20', level: 3, max: 20 },
      { rule: 'mixedChain', level: 2, max: 20 },
    ];
    for (const c of cases) {
      for (let seed = 0; seed < 200; seed++) {
        const e = genExpression({ level: c.level, rule: c.rule, seed });
        expect(e.answer).toBeGreaterThanOrEqual(0); // 结果为负被排除
        expect(e.answer).toBeLessThanOrEqual(c.max);
      }
    }
  });
});
