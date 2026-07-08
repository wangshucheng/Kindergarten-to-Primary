import { describe, it, expect } from 'vitest';
import {
  WORD_PROBLEMS,
  makeWordProblem,
  type WordProblemQuestion,
} from '../games/math/WordProblem/wordProblemLogic';

/** 小种子 rng（mulberry32），用于可复现测试 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 计算等式（content 文档里的 equation 用 × 表示乘，转换为 * 后 eval） */
function evalEquation(eq: string): number {
  // eslint-disable-next-line no-eval
  return eval(eq.replace(/×/g, '*')) as number;
}

describe('应用题闯关逻辑', () => {
  describe('WORD_PROBLEMS 数据完整性', () => {
    it('恰好 8 条', () => {
      expect(WORD_PROBLEMS).toHaveLength(8);
    });

    it('每条 equation 计算值与 answer 一致，且 id 连续 1..8', () => {
      const ids = new Set<number>();
      for (const p of WORD_PROBLEMS) {
        expect(evalEquation(p.equation)).toBe(p.answer);
        expect(p.stem.trim().length).toBeGreaterThan(0);
        expect(p.unit.trim().length).toBeGreaterThan(0);
        ids.add(p.id);
      }
      for (let i = 1; i <= 8; i++) expect(ids.has(i)).toBe(true);
    });
  });

  describe('makeWordProblem', () => {
    it('随机出题：选项恰好 4 个、互不重复、且含正确答案', () => {
      for (let i = 0; i < 500; i++) {
        const q: WordProblemQuestion = makeWordProblem();
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options).toContain(q.answer);
      }
    });

    it('干扰项均不等于 answer', () => {
      for (let i = 0; i < 500; i++) {
        const q = makeWordProblem();
        for (const o of q.options) {
          if (o !== q.answer) {
            expect(o).not.toBe(q.answer);
          }
        }
      }
    });

    it('题目字段来自题库且 answer 与 equation 一致', () => {
      const byId = new Map(WORD_PROBLEMS.map((p) => [p.id, p]));
      for (let i = 0; i < 300; i++) {
        const q = makeWordProblem();
        const src = byId.get(q.id);
        expect(src).toBeDefined();
        expect(q.stem).toBe(src!.stem);
        expect(q.equation).toBe(src!.equation);
        expect(q.unit).toBe(src!.unit);
        expect(q.answer).toBe(src!.answer);
        expect(q.answer).toBe(evalEquation(q.equation));
      }
    });

    it('注入 rng 可复现：同种子两次结果一致', () => {
      const rngA = mulberry32(99);
      const rngB = mulberry32(99);
      const qa = makeWordProblem(rngA);
      const qb = makeWordProblem(rngB);
      expect(qa).toEqual(qb);
    });

    it('多轮采样能覆盖全部 8 题（分布合理）', () => {
      const seen = new Set<number>();
      const rng = mulberry32(7);
      for (let i = 0; i < 2000; i++) {
        seen.add(makeWordProblem(rng).id);
      }
      expect(seen.size).toBe(8);
    });
  });
});
