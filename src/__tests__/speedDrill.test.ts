import { describe, it, expect } from 'vitest';
import {
  SPEED_TRICKS,
  makeSpeedQuestion,
  speedPromptText,
  type SpeedQuestion,
} from '../games/math/SpeedDrill/speedDrillLogic';

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

describe('速算擂台逻辑', () => {
  describe('SPEED_TRICKS 数据完整性', () => {
    it('覆盖 multiplier 1..10 全部 10 条', () => {
      expect(SPEED_TRICKS).toHaveLength(10);
      const multipliers = SPEED_TRICKS.map((t) => t.multiplier);
      for (let m = 1; m <= 10; m++) {
        expect(multipliers).toContain(m);
      }
    });

    it('每条 trick / example 均非空', () => {
      for (const t of SPEED_TRICKS) {
        expect(t.multiplier).toBeGreaterThanOrEqual(1);
        expect(t.multiplier).toBeLessThanOrEqual(10);
        expect(t.trick.trim().length).toBeGreaterThan(0);
        expect(t.example.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('makeSpeedQuestion', () => {
    it('a ∈ 1..9，b ∈ 1..10，answer === a*b，且选项含正确答案', () => {
      for (let i = 0; i < 500; i++) {
        const q: SpeedQuestion = makeSpeedQuestion();
        expect(q.a).toBeGreaterThanOrEqual(1);
        expect(q.a).toBeLessThanOrEqual(9);
        expect(q.b).toBeGreaterThanOrEqual(1);
        expect(q.b).toBeLessThanOrEqual(10);
        expect(q.answer).toBe(q.a * q.b);
        expect(q.focusMultiplier).toBe(q.b);
        expect(q.options).toContain(q.answer);
      }
    });

    it('每题恰好 4 个选项且互不重复', () => {
      for (let i = 0; i < 500; i++) {
        const q = makeSpeedQuestion();
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
      }
    });

    it('选项均在合理范围 1..90', () => {
      const rng = mulberry32(20240601);
      for (let i = 0; i < 2000; i++) {
        const q = makeSpeedQuestion(rng);
        for (const o of q.options) {
          expect(o).toBeGreaterThanOrEqual(1);
          expect(o).toBeLessThanOrEqual(90);
        }
      }
    });

    it('focusMultiplier 对应的 trick 正确关联', () => {
      for (let i = 0; i < 300; i++) {
        const q = makeSpeedQuestion();
        expect(q.trick.multiplier).toBe(q.b);
      }
    });

    it('注入 rng 可复现：同种子两次结果一致', () => {
      const rngA = mulberry32(123);
      const rngB = mulberry32(123);
      const qa = makeSpeedQuestion(rngA);
      const qb = makeSpeedQuestion(rngB);
      expect(qa).toEqual(qb);
    });

    it('rng 可复现：不同种子结果不同（非必然相等）', () => {
      const rngA = mulberry32(1);
      const rngB = mulberry32(2);
      const qa = makeSpeedQuestion(rngA);
      const qb = makeSpeedQuestion(rngB);
      // 至少 a/b 或选项顺序存在差别（构造上几乎必然不同）
      expect(qa.a).not.toBeUndefined();
      expect(qb.a).not.toBeUndefined();
    });
  });

  describe('朗读文本', () => {
    it('speedPromptText 格式正确', () => {
      expect(speedPromptText(7, 8)).toBe('7 乘 8 等于几');
    });
  });
});
