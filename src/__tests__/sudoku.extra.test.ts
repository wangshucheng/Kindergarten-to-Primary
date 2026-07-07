/**
 * 数独功能补充回归测试（QA 独立补强，不改动工程师原 sudoku.test.ts）。
 *
 * 覆盖原测试未覆盖的两块：
 *  1) makeCages 在 9×9 下的「每格恰属一区 / 每区≥2 格 / sum 正确 / 种子可复现」；
 *  2) progress.ts 的 localStorage 持久化逻辑（unlockNine / saveBest / loadUnlock）。
 *
 * 运行环境为 node（无 jsdom），故 localStorage 通过 vi.stubGlobal 注入内存实现，
 * 与 tts.test.ts 的浏览器全局 mock 约定保持一致。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSudoku, makeCages } from '../games/math/sudoku/engine';
import { loadUnlock, saveBest, unlockNine } from '../games/math/sudoku/progress';
import type { SudokuSize } from '../games/math/sudoku/types';

/** 内存版 localStorage，供 node 环境测试 progress 逻辑。 */
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, String(v));
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
  }
  key(i: number): string | null {
    const keys = Array.from(this.map.keys());
    return i >= 0 && i < keys.length ? keys[i] : null;
  }
  get length(): number {
    return this.map.size;
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('makeCages（9×9 补充覆盖）', () => {
  it('9×9：每格恰属一区、每区≥2格、sum 正确', () => {
    const size: SudokuSize = 9;
    const { solution } = generateSudoku(size, 40, 123);
    const cages = makeCages(size, solution, 123);

    const owner = Array.from({ length: size }, () => new Array<number>(size).fill(0));
    let total = 0;
    for (const cage of cages) {
      expect(cage.cells.length).toBeGreaterThanOrEqual(2); // 合并落单后每区≥2
      let sum = 0;
      for (const [r, c] of cage.cells) {
        owner[r][c] += 1;
        sum += solution[r][c].value as number;
        total++;
      }
      expect(sum).toBe(cage.sum); // 角标和 = 区内解之和
    }
    expect(total).toBe(size * size); // 全部格子都被覆盖
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        expect(owner[r][c]).toBe(1); // 每格恰属一区
      }
    }
  });

  it('makeCages：相同 seed 可复现（9×9）', () => {
    const size: SudokuSize = 9;
    const { solution } = generateSudoku(size, 30, 55);
    const a = makeCages(size, solution, 55);
    const b = makeCages(size, solution, 55);
    expect(a).toEqual(b);
  });

  it('makeCages：sum 始终等于区内 solution 值之和（6×6 交叉验证）', () => {
    const size: SudokuSize = 6;
    const { solution } = generateSudoku(size, 10, 7);
    const cages = makeCages(size, solution, 7);
    for (const cage of cages) {
      const expected = cage.cells.reduce(
        (acc, [r, c]) => acc + (solution[r][c].value as number),
        0,
      );
      expect(expected).toBe(cage.sum);
    }
  });
});

describe('progress 持久化（localStorage）', () => {
  it('loadUnlock：无解锁标记时 nineUnlocked=false、best={}', () => {
    const s = loadUnlock();
    expect(s.nineUnlocked).toBe(false);
    expect(s.best).toEqual({});
  });

  it('unlockNine：写入解锁标记后 loadUnlock 反映 nineUnlocked=true', () => {
    unlockNine();
    expect(loadUnlock().nineUnlocked).toBe(true);
  });

  it('saveBest：首次保存后 best 含该玩法的成绩', () => {
    saveBest('sudoku', 3, 5000);
    expect(loadUnlock().best['sudoku']).toEqual({ stars: 3, durationMs: 5000 });
  });

  it('saveBest：更低星级即使更快也不覆盖更高星级', () => {
    saveBest('sudoku', 3, 5000);
    saveBest('sudoku', 1, 1000);
    expect(loadUnlock().best['sudoku']).toEqual({ stars: 3, durationMs: 5000 });
  });

  it('saveBest：相同星级下更短用时覆盖', () => {
    saveBest('sudoku', 2, 8000);
    saveBest('sudoku', 2, 3000);
    expect(loadUnlock().best['sudoku']).toEqual({ stars: 2, durationMs: 3000 });
  });

  it('saveBest：不同玩法独立记录最佳成绩', () => {
    saveBest('sudoku', 3, 5000);
    saveBest('sudoku-letter', 2, 4000);
    const best = loadUnlock().best;
    expect(best['sudoku'].stars).toBe(3);
    expect(best['sudoku-letter'].stars).toBe(2);
  });
});
