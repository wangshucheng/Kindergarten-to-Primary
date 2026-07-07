import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createBoard,
  move,
  canMove,
  type MergeState,
} from '../games/math/NumberMerge/mergeLogic';

// 固定 Math.random：spawn 永远选「第一个空格」且值恒为 2，使 move 结果可断言
let restore: () => void;
beforeEach(() => {
  const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
  restore = () => spy.mockRestore();
});
afterEach(() => restore());

function makeState(board: number[][], target = 2048): MergeState {
  return {
    size: board.length,
    board,
    score: 0,
    won: false,
    over: false,
    target,
  };
}

describe('NumberMerge 2048 逻辑', () => {
  it('createBoard：尺寸正确且恰好 2 个非零块', () => {
    const s = createBoard(4, 2048);
    expect(s.size).toBe(4);
    expect(s.board.length).toBe(4);
    expect(s.board.every((row) => row.length === 4)).toBe(true);
    const nonZero = s.board.flat().filter((v) => v !== 0).length;
    expect(nonZero).toBe(2);
    expect(s.won).toBe(false);
    expect(s.over).toBe(false);
    expect(s.target).toBe(2048);
  });

  it('move left：合并同类并计分', () => {
    const s = makeState([
      [2, 2, 2, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const next = move(s, 'left');
    // 行0: [2,2,2,2] -> [4,4] +spawn(0,2)=2 -> [4,4,2,0]
    expect(next.board[0]).toEqual([4, 4, 2, 0]);
    expect(next.score).toBe(8);
  });

  it('move left：异类不合并（保持不变则返回原状态）', () => {
    const s = makeState([
      [2, 4, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const next = move(s, 'left');
    expect(next).toBe(s);
  });

  it('move right：合并靠右', () => {
    const s = makeState([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const next = move(s, 'right');
    // 行0: [2,2,0,0] -> 右合并 [0,0,0,4] +spawn(0,0)=2 -> [2,0,0,4]
    expect(next.board[0]).toEqual([2, 0, 0, 4]);
    expect(next.score).toBe(4);
  });

  it('move up：列合并（合并块落在顶部）', () => {
    const s = makeState(
      [
        [2, 0],
        [2, 0],
      ],
      4,
    );
    const next = move(s, 'up');
    expect(next.board[0][0]).toBe(4);
    expect(next.score).toBe(4);
  });

  it('move down：列合并（合并块落在底部）', () => {
    const s = makeState(
      [
        [2, 0],
        [2, 0],
      ],
      4,
    );
    const next = move(s, 'down');
    expect(next.board[1][0]).toBe(4);
    expect(next.score).toBe(4);
  });

  it('move：单次合并后非空块数量不变（合并-1 + 生成+1），且尺寸不变', () => {
    const s = makeState([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const before = s.board.flat().filter((v) => v !== 0).length;
    const next = move(s, 'left');
    const after = next.board.flat().filter((v) => v !== 0).length;
    expect(after).toBe(before);
    expect(next.board.length).toBe(4);
  });

  it('move：over 状态直接返回原状态', () => {
    const s = makeState(
      [
        [2, 4],
        [4, 2],
      ],
      4,
    );
    s.over = true;
    const next = move(s, 'left');
    expect(next).toBe(s);
  });

  it('won：合并达到目标值即标记胜利', () => {
    const s = makeState(
      [
        [1024, 1024, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      2048,
    );
    const next = move(s, 'left');
    expect(next.won).toBe(true);
  });

  it('move：满盘无可合并 -> over=true（死局判定）', () => {
    const s = makeState(
      [
        [4, 2, 4, 0],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 2],
      ],
      2048,
    );
    const next = move(s, 'right');
    expect(next.over).toBe(true);
    const zeros = next.board.flat().filter((v) => v === 0).length;
    expect(zeros).toBe(0);
  });

  it('canMove：满盘无相邻相同 -> false', () => {
    expect(canMove([[2, 4], [4, 2]])).toBe(false);
  });

  it('canMove：存在可合并 -> true', () => {
    expect(canMove([[2, 2], [4, 8]])).toBe(true);
  });

  it('canMove：存在空格 -> true', () => {
    expect(canMove([[2, 0], [4, 8]])).toBe(true);
  });

  it('move 后 over 与 !canMove 一致（不变量）', () => {
    const s = makeState([
      [2, 2, 4, 8],
      [4, 8, 2, 4],
      [2, 4, 8, 2],
      [4, 8, 2, 4],
    ]);
    const next = move(s, 'left');
    expect(next.over).toBe(!canMove(next.board));
  });
});
