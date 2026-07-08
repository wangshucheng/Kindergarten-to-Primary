import { describe, it, expect } from 'vitest';
import {
  makeQuestion,
  buildTable,
  rhymeText,
  promptText,
} from '../games/math/Multiplication/multiplicationLogic';

describe('乘法口诀逻辑', () => {
  describe('makeQuestion', () => {
    it('a,b ∈ 1..9，answer 等于 a*b，且选项含正确答案', () => {
      for (let i = 0; i < 500; i++) {
        const q = makeQuestion();
        expect(q.a).toBeGreaterThanOrEqual(1);
        expect(q.a).toBeLessThanOrEqual(9);
        expect(q.b).toBeGreaterThanOrEqual(1);
        expect(q.b).toBeLessThanOrEqual(9);
        expect(q.answer).toBe(q.a * q.b);
        expect(q.options).toContain(q.answer);
      }
    });

    it('每题恰好 4 个选项且互不重复', () => {
      for (let i = 0; i < 500; i++) {
        const q = makeQuestion();
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
      }
    });

    it('边界值 1×1 与 9×9 均正确生成且不越界（选项 ∈ 1..81）', () => {
      const seededRng = (() => {
        let s = 12345;
        return () => {
          s = (s * 1664525 + 1013904223) >>> 0;
          return s / 0xffffffff;
        };
      })();
      // 暴力采样，确保边界乘积附近不出现越界/重复
      for (let i = 0; i < 2000; i++) {
        const q = makeQuestion(seededRng);
        for (const o of q.options) {
          expect(o).toBeGreaterThanOrEqual(1);
          expect(o).toBeLessThanOrEqual(81);
        }
      }
    });

    it('注入 rng 可复现：同种子生成同题', () => {
      const rngA = () => 0.5;
      const rngB = () => 0.5;
      const qa = makeQuestion(rngA);
      const qb = makeQuestion(rngB);
      expect(qa).toEqual(qb);
    });
  });

  describe('buildTable', () => {
    it('生成 9×9 口诀表，且每个单元格 a*b === product', () => {
      const table = buildTable();
      expect(table).toHaveLength(9);
      for (const row of table) {
        expect(row).toHaveLength(9);
        for (const cell of row) {
          expect(cell.a).toBeGreaterThanOrEqual(1);
          expect(cell.a).toBeLessThanOrEqual(9);
          expect(cell.b).toBeGreaterThanOrEqual(1);
          expect(cell.b).toBeLessThanOrEqual(9);
          expect(cell.product).toBe(cell.a * cell.b);
        }
      }
    });

    it('表格首格 1×1=1，末格 9×9=81', () => {
      const table = buildTable();
      expect(table[0][0]).toEqual({ a: 1, b: 1, product: 1 });
      expect(table[8][8]).toEqual({ a: 9, b: 9, product: 81 });
    });
  });

  describe('朗读文本', () => {
    it('rhymeText / promptText 格式正确', () => {
      expect(rhymeText(3, 4)).toBe('3 乘 4 等于 12');
      expect(promptText(3, 4)).toBe('3 乘 4 等于几');
    });
  });
});
