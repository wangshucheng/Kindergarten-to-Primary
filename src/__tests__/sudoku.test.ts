import { describe, it, expect } from 'vitest';
import {
  generateSudoku,
  validateCell,
  isComplete,
  countSolutions,
  solve,
  makeCages,
  numberToLetter,
  emptyBoard,
  cloneBoard,
} from '../games/math/sudoku/engine';
import type { SudokuSize, Board } from '../games/math/sudoku/types';

/** 校验棋盘是否「满且无冲突」（行/列/宫各含 1..size）。 */
function solutionIsValid(board: Board): boolean {
  const size = board.length;
  const rows = size === 9 ? 3 : 2;
  const cols = 3;
  const newSet = (): Set<number> => new Set<number>();

  for (let r = 0; r < size; r++) {
    const s = newSet();
    for (let c = 0; c < size; c++) {
      const v = board[r][c].value;
      if (v === null || s.has(v)) return false;
      s.add(v);
    }
  }
  for (let c = 0; c < size; c++) {
    const s = newSet();
    for (let r = 0; r < size; r++) {
      const v = board[r][c].value;
      if (v === null || s.has(v)) return false;
      s.add(v);
    }
  }
  for (let br = 0; br < size; br += rows) {
    for (let bc = 0; bc < size; bc += cols) {
      const s = newSet();
      for (let r = br; r < br + rows; r++) {
        for (let c = bc; c < bc + cols; c++) {
          const v = board[r][c].value;
          if (v === null || s.has(v)) return false;
          s.add(v);
        }
      }
    }
  }
  return true;
}

/** 统计棋盘空格数。 */
function countBlanks(board: Board): number {
  let n = 0;
  for (const row of board) for (const cell of row) if (cell.value === null) n++;
  return n;
}

describe('Sudoku 引擎', () => {
  it('generateSudoku：6x6 谜面空格数=holes 且解完整合法且唯一解', () => {
    const size: SudokuSize = 6;
    const holes = 22;
    const { puzzle, solution } = generateSudoku(size, holes, 2024);
    expect(countBlanks(puzzle)).toBe(holes);
    for (const row of solution) for (const cell of row) expect(cell.value).not.toBeNull();
    expect(solutionIsValid(solution)).toBe(true);
    expect(countSolutions(puzzle, 2)).toBe(1);
  });

  it('generateSudoku：9x9 谜面空格数=holes 且解完整合法且唯一解', () => {
    const size: SudokuSize = 9;
    const holes = 50;
    const { puzzle, solution } = generateSudoku(size, holes, 99);
    expect(countBlanks(puzzle)).toBe(holes);
    for (const row of solution) for (const cell of row) expect(cell.value).not.toBeNull();
    expect(solutionIsValid(solution)).toBe(true);
    expect(countSolutions(puzzle, 2)).toBe(1);
  });

  it('generateSudoku：同种子可复现', () => {
    const a = generateSudoku(6, 20, 777);
    const b = generateSudoku(6, 20, 777);
    expect(a.puzzle).toEqual(b.puzzle);
    expect(a.solution).toEqual(b.solution);
  });

  it('validateCell：行/列/宫冲突判定', () => {
    const size: SudokuSize = 9;
    const board = emptyBoard(size);
    board[0][0].value = 5;
    expect(validateCell(board, 0, 3, 5)).toBe(false); // 同行冲突
    expect(validateCell(board, 3, 0, 5)).toBe(false); // 同列冲突
    expect(validateCell(board, 1, 1, 5)).toBe(false); // 同宫冲突
    expect(validateCell(board, 0, 1, 6)).toBe(true); // 无冲突
  });

  it('isComplete：满盘合法为真，有空格为假', () => {
    const size: SudokuSize = 6;
    const { solution } = generateSudoku(size, 10, 42);
    expect(isComplete(solution)).toBe(true);
    const partial = cloneBoard(solution);
    partial[0][0].value = null;
    expect(isComplete(partial)).toBe(false);
  });

  it('solve：能解出给定谜面', () => {
    const size: SudokuSize = 6;
    const { puzzle } = generateSudoku(size, 18, 13);
    const sol = solve(puzzle);
    expect(sol).not.toBeNull();
    expect(isComplete(sol as Board)).toBe(true);
  });

  it('numberToLetter：1->A, 6->F, 9->I', () => {
    expect(numberToLetter(1, 6)).toBe('A');
    expect(numberToLetter(6, 6)).toBe('F');
    expect(numberToLetter(1, 9)).toBe('A');
    expect(numberToLetter(9, 9)).toBe('I');
  });

  it('makeCages：每格恰属一区且 sum 正确', () => {
    const size: SudokuSize = 6;
    const { solution } = generateSudoku(size, 12, 8);
    const cages = makeCages(size, solution, 8);
    const owner = Array.from({ length: size }, () => new Array<number>(size).fill(0));
    let totalCells = 0;
    for (const cage of cages) {
      let sum = 0;
      for (const [r, c] of cage.cells) {
        owner[r][c] += 1;
        sum += solution[r][c].value as number;
        totalCells++;
      }
      expect(sum).toBe(cage.sum);
    }
    expect(totalCells).toBe(size * size);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        expect(owner[r][c]).toBe(1);
      }
    }
  });
});
