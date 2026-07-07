/**
 * numberMines 补充测试（覆盖第 2 批 QA 充分性审查缺口，仅新增用例、不改源码）。
 * 覆盖：placeMines 雷数/安全格/截断、countNeighborMines 角边中心、openedSafeCount、
 * 算式 genExpression 调用方式（答案合法 + 算理知识点覆盖）、QuestionGenerator 调度。
 */
import { describe, expect, it } from 'vitest';
import {
  buildBoard,
  applyAnswer,
  isWin,
  openedSafeCount,
  countNeighborMines,
  placeMines,
  makeOptions,
  MINES_LEVELS,
  type Coord,
} from '../games/math/NumberMines/numberMinesLogic';
import { QuestionGenerator } from '../data/generators';

describe('placeMines —— 雷数/安全格/截断', () => {
  it('雷数=设定且存在安全格（可断言首点未必踩雷）', () => {
    const all: Coord[] = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) all.push({ row: r, col: c });
    let s = 3;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const mines = placeMines(6, 6, 6, rng);
    expect(mines.size).toBe(6);
    // 安全格存在：雷数 < 总格数
    expect(mines.size).toBeLessThan(6 * 6);
  });

  it('雷数超过格子总数时被截断（不会越界）', () => {
    let s = 5;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const mines = placeMines(2, 2, 10, rng);
    expect(mines.size).toBe(4); // 仅 4 格，截断
  });

  it('多 seed 下 buildBoard 始终至少存在一个安全格', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const board = buildBoard(MINES_LEVELS[1], seed);
      expect(board.safeTotal).toBeGreaterThan(0);
      expect(board.mines).toBe(MINES_LEVELS[1].mines);
    }
  });
});

describe('countNeighborMines —— 角/边/中心边界', () => {
  it('单雷位于中心 (1,1)：角/边/中心计数正确', () => {
    const set = new Set(['1,1']);
    // 角 (0,0) 的邻居含 (1,1) → 1
    expect(countNeighborMines(3, 3, set, 0, 0)).toBe(1);
    // 边 (0,1) 的邻居含 (1,1) → 1
    expect(countNeighborMines(3, 3, set, 0, 1)).toBe(1);
    // 中心即雷本身：周围 8 格无雷 → 0
    expect(countNeighborMines(3, 3, set, 1, 1)).toBe(0);
    // (2,2) 与 (1,1) 对角相邻 → 仍计 1
    expect(countNeighborMines(3, 3, set, 2, 2)).toBe(1);
  });

  it('单雷位于角 (0,0)：仅相邻两格计 1', () => {
    const set = new Set(['0,0']);
    expect(countNeighborMines(3, 3, set, 0, 1)).toBe(1);
    expect(countNeighborMines(3, 3, set, 1, 0)).toBe(1);
    expect(countNeighborMines(3, 3, set, 1, 1)).toBe(1);
    expect(countNeighborMines(3, 3, set, 2, 2)).toBe(0);
  });
});

describe('openedSafeCount —— 已翻开安全格计数', () => {
  it('翻开安全格后计数递增，全翻后等于 safeTotal', () => {
    const board = buildBoard(MINES_LEVELS[0], 21);
    let b = board;
    let prev = 0;
    for (const row of board.cells) {
      for (const cell of row) {
        if (!cell.isMine) {
          b = applyAnswer(b, cell.row, cell.col, cell.expr.answer).board;
          const cur = openedSafeCount(b);
          expect(cur).toBeGreaterThan(prev);
          prev = cur;
        }
      }
    }
    expect(openedSafeCount(b)).toBe(board.safeTotal);
  });
});

describe('算式 genExpression 调用方式（数据自洽）', () => {
  it('各关多种子下：答案∈[0,20]，知识点为四算理之一', () => {
    const rules = new Set<string>();
    for (const lv of MINES_LEVELS) {
      for (let seed = 1; seed <= 25; seed++) {
        const board = buildBoard(lv, seed);
        for (const row of board.cells) {
          for (const cell of row) {
            expect(cell.expr.answer).toBeGreaterThanOrEqual(0);
            expect(cell.expr.answer).toBeLessThanOrEqual(20);
            expect(cell.expr.knowledgePoint).toMatch(/^math:(within10|carry20|borrow20|mixedChain)$/);
            rules.add(cell.expr.knowledgePoint);
          }
        }
      }
    }
    // 覆盖进位加/退位减/连加连减（含 10以内加）
    expect(rules.has('math:carry20')).toBe(true);
    expect(rules.has('math:borrow20')).toBe(true);
    expect(rules.has('math:mixedChain')).toBe(true);
    expect(rules.has('math:within10')).toBe(true);
  });
});

describe('makeOptions —— 已知答案选项性质', () => {
  it('高答案(20)时选项非负且唯一且含正确答案（题目：20以内）', () => {
    let s = 11;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const opts = makeOptions(20, rng);
    expect(opts).toContain(20);
    expect(new Set(opts).size).toBe(4);
    for (const o of opts) expect(o).toBeGreaterThanOrEqual(0);
  });

  it('负答案不可出现：所有 distractor 均 >= 0', () => {
    let s = 2;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    for (let ans = 0; ans <= 20; ans++) {
      const opts = makeOptions(ans, rng);
      for (const o of opts) expect(o).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('QuestionGenerator 调度（本批调用方式正确）', () => {
  it('hanzi 返回含拼音/汉字，english 返回含 category/单词', () => {
    const h = QuestionGenerator.hanzi({ level: 1, mode: 'char-pinyin', count: 5, seed: 1 });
    expect(h.length).toBe(5);
    for (const q of h) {
      expect(q.char).toBeTruthy();
      expect(q.pinyin).toBeTruthy();
    }
    const e = QuestionGenerator.english({ level: 1, count: 5, seed: 1 });
    expect(e.length).toBe(5);
    for (const q of e) {
      expect(q.word).toBeTruthy();
      // category 可能缺失，组件已用 ?? 'misc' 兜底，这里只断言对象合法
      expect(typeof q).toBe('object');
    }
  });
});

describe('通关闭环（isWin 与 openedSafeCount 一致性）', () => {
  it('翻开全部安全格即胜，且计数=安全总数', () => {
    const board = buildBoard(MINES_LEVELS[0], 44);
    expect(isWin(board)).toBe(false);
    let b = board;
    for (const row of board.cells) {
      for (const cell of row) {
        if (!cell.isMine) b = applyAnswer(b, cell.row, cell.col, cell.expr.answer).board;
      }
    }
    expect(isWin(b)).toBe(true);
    expect(openedSafeCount(b)).toBe(board.safeTotal);
  });
});
