/**
 * numberMines 纯逻辑测试（node 环境）。
 * 覆盖：雷布置与雷数梯度、邻居雷数计算、算式关联(genExpression)、翻开判定、胜负、作答选项。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  buildBoard,
  applyAnswer,
  isWin,
  countNeighborMines,
  makeOptions,
  MINES_LEVELS,
  type Coord,
} from '../games/math/NumberMines/numberMinesLogic';

describe('buildBoard', () => {
  it('雷数与安全格数正确，每格附带合法算式', () => {
    const lv = MINES_LEVELS[0];
    const board = buildBoard(lv, 123);
    expect(board.mines).toBe(lv.mines);
    expect(board.safeTotal).toBe(lv.rows * lv.cols - lv.mines);
    let cells = 0;
    for (const row of board.cells) {
      for (const cell of row) {
        cells++;
        // 算式答案在 0..20（20以内加减）
        expect(cell.expr.answer).toBeGreaterThanOrEqual(0);
        expect(cell.expr.answer).toBeLessThanOrEqual(20);
        expect(cell.expr.text).toMatch(/[0-9]/);
        expect(cell.expr.knowledgePoint).toMatch(/^math:/);
      }
    }
    expect(cells).toBe(lv.rows * lv.cols);
  });

  it('同种子确定性生成（雷位与算式一致）', () => {
    const lv = MINES_LEVELS[1];
    const a = buildBoard(lv, 555);
    const b = buildBoard(lv, 555);
    const sig = (bd: typeof a) =>
      bd.cells.map((r) => r.map((c) => `${c.isMine ? 'M' : 'S'}:${c.expr.text}`).join(',')).join('|');
    expect(sig(a)).toBe(sig(b));
  });

  it('雷数梯度：6 → 10 → 14', () => {
    expect(MINES_LEVELS.map((l) => l.mines)).toEqual([6, 10, 14]);
  });
});

describe('countNeighborMines', () => {
  it('按显式雷位计算邻居雷数', () => {
    const mines: Coord[] = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ];
    const set = new Set(mines.map((m) => `${m.row},${m.col}`));
    // (1,1) 的邻居含 (0,0),(0,1) → 2
    expect(countNeighborMines(3, 3, set, 1, 1)).toBe(2);
    // (2,2) 远离雷 → 0
    expect(countNeighborMines(3, 3, set, 2, 2)).toBe(0);
    // (0,2) 的邻居含 (0,1) → 1
    expect(countNeighborMines(3, 3, set, 0, 2)).toBe(1);
  });

  it('buildBoard 的 neighborMines 与实际雷位一致', () => {
    const lv = MINES_LEVELS[0];
    const board = buildBoard(lv, 77);
    const mines = new Set<string>();
    for (const row of board.cells)
      for (const cell of row) if (cell.isMine) mines.add(`${cell.row},${cell.col}`);
    for (const row of board.cells) {
      for (const cell of row) {
        expect(cell.neighborMines).toBe(countNeighborMines(lv.rows, lv.cols, mines, cell.row, cell.col));
      }
    }
  });
});

describe('applyAnswer', () => {
  it('安全格答对 → 翻开并返回算理知识点', () => {
    const lv = MINES_LEVELS[0];
    const board = buildBoard(lv, 31);
    // 找一个安全格
    let target: { r: number; c: number } | null = null;
    for (const row of board.cells)
      for (const cell of row)
        if (!cell.isMine) {
          target = { r: cell.row, c: cell.col };
          break;
        }
    expect(target).not.toBeNull();
    const cell = board.cells[target!.r][target!.c];
    const res = applyAnswer(board, target!.r, target!.c, cell.expr.answer);
    expect(res.correct).toBe(true);
    expect(res.isMine).toBe(false);
    expect(res.knowledgePoint).toBe(cell.expr.knowledgePoint);
    expect(res.board.cells[target!.r][target!.c].opened).toBe(true);
  });

  it('答错 → 不翻开，标记 wrong', () => {
    const lv = MINES_LEVELS[0];
    const board = buildBoard(lv, 31);
    let target: { r: number; c: number } | null = null;
    for (const row of board.cells)
      for (const cell of row)
        if (!cell.isMine) {
          target = { r: cell.row, c: cell.col };
          break;
        }
    const wrongAnswer = (board.cells[target!.r][target!.c].expr.answer + 1) % 20;
    const res = applyAnswer(board, target!.r, target!.c, wrongAnswer);
    expect(res.correct).toBe(false);
    expect(res.board.cells[target!.r][target!.c].opened).toBe(false);
    expect(res.board.cells[target!.r][target!.c].wrong).toBe(true);
  });

  it('踩中雷（答对算式但为雷格）→ 揭示雷、无知识点', () => {
    const lv = MINES_LEVELS[0];
    const board = buildBoard(lv, 31);
    let target: { r: number; c: number } | null = null;
    for (const row of board.cells)
      for (const cell of row)
        if (cell.isMine) {
          target = { r: cell.row, c: cell.col };
          break;
        }
    expect(target).not.toBeNull();
    const cell = board.cells[target!.r][target!.c];
    const res = applyAnswer(board, target!.r, target!.c, cell.expr.answer);
    expect(res.correct).toBe(true);
    expect(res.isMine).toBe(true);
    expect(res.knowledgePoint).toBeUndefined();
    expect(res.board.cells[target!.r][target!.c].steppedMine).toBe(true);
  });
});

describe('isWin', () => {
  it('全部安全格翻开 → 胜；尚有安全格未翻开 → 未胜', () => {
    const lv = MINES_LEVELS[0];
    const board = buildBoard(lv, 8);
    expect(isWin(board)).toBe(false);
    // 翻开所有安全格
    let b = board;
    for (const row of board.cells) {
      for (const cell of row) {
        if (!cell.isMine) b = applyAnswer(b, cell.row, cell.col, cell.expr.answer).board;
      }
    }
    expect(isWin(b)).toBe(true);
    expect(openedSafe(b)).toBe(board.safeTotal);
  });
});

describe('makeOptions', () => {
  it('包含正确答案，4 个选项非负且唯一', () => {
    const optRng = (() => {
      let s = 42;
      return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
      };
    })();
    const opts = makeOptions(7, optRng);
    expect(opts.length).toBe(4);
    expect(opts).toContain(7);
    expect(new Set(opts).size).toBe(4);
    for (const o of opts) expect(o).toBeGreaterThanOrEqual(0);
  });

  it('答案为 0 时选项仍非负', () => {
    const optRng = (() => {
      let s = 7;
      return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
      };
    })();
    const opts = makeOptions(0, optRng);
    expect(opts).toContain(0);
    for (const o of opts) expect(o).toBeGreaterThanOrEqual(0);
  });
});

describe('可复现随机（固定 Math.random）', () => {
  beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0.5));
  afterEach(() => vi.restoreAllMocks());
  it('buildBoard 在固定随机下确定性生成', () => {
    const lv = MINES_LEVELS[0];
    const a = buildBoard(lv, 1);
    const b = buildBoard(lv, 1);
    expect(a.mines).toBe(b.mines);
    expect(
      a.cells.map((r) => r.map((c) => `${c.isMine}:${c.expr.text}`).join(',')).join('|'),
    ).toBe(b.cells.map((r) => r.map((c) => `${c.isMine}:${c.expr.text}`).join(',')).join('|'));
  });
});

function openedSafe(bd: ReturnType<typeof buildBoard>): number {
  let n = 0;
  for (const row of bd.cells) for (const cell of row) if (!cell.isMine && cell.opened) n++;
  return n;
}
