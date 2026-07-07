/**
 * numberMinesLogic —— 数字扫雷纯逻辑（不依赖 React，可单测）。
 *
 * 玩法融合（符合 PRD「数字扫雷可训练加减法运算」）：
 * - 棋盘部分格子藏“雷”，其余格子翻开后显示其周围 8 格的雷数提示（经典扫雷数字）。
 * - 翻开某安全格时触发一道 20 以内加减算式（mathGenerator.genExpression，规则在
 *   within10 / carry20 / borrow20 / mixedChain 间随机，覆盖进位加、退位减等算理），
 *   答对才算成功翻开并收集该算理知识点（如 `math:carry20`）。
 * - 雷的定义：随机布置，玩家需“避开”；点中雷即踩雷（失误），雷格显示 💣。
 * - 翻开安全格后展示的邻居雷数，帮助幼儿像扫雷一样推理避开雷区。
 *
 * 关卡雷数梯度：6 → 10 → 14（网格 6×6 / 7×7 / 8×8）。
 */
import type { Rng } from '../../../utils/rng';
import { createRng } from '../../../utils/rng';
import { shuffle, pick } from '../../../utils/shuffle';
import { genExpression, type MathExpr } from '../../../data/generators/mathGenerator';
import type { Coord } from '../../_shared/matchDetector';
export type { Coord } from '../../_shared/matchDetector';

export interface MinesCell {
  row: number;
  col: number;
  isMine: boolean;
  /** 周围 8 格中的雷数（经典扫雷提示数字） */
  neighborMines: number;
  /** 翻开时触发并需解答的算式 */
  expr: MathExpr;
  /** 是否已翻开（安全格成功解答 / 踩中雷揭示） */
  revealed: boolean;
  /** 是否作为安全格成功解答翻开 */
  opened: boolean;
  /** 是否踩中雷（揭示） */
  steppedMine: boolean;
  /** 上次作答是否错误（用于抖动反馈） */
  wrong: boolean;
}

export interface MinesBoard {
  rows: number;
  cols: number;
  mines: number;
  /** 安全格总数（需全部翻开才算通关） */
  safeTotal: number;
  cells: MinesCell[][];
}

export interface MinesLevel {
  index: number;
  rows: number;
  cols: number;
  mines: number;
  title: string;
  /** 传给 mathGenerator 的数学难度（决定算式规则与算理知识点） */
  level: 1 | 2 | 3;
}

/** 三关难度梯度：雷数 6 → 10 → 14 */
export const MINES_LEVELS: MinesLevel[] = [
  { index: 0, rows: 6, cols: 6, mines: 6, title: '第 1 关 · 启蒙', level: 1 },
  { index: 1, rows: 7, cols: 7, mines: 10, title: '第 2 关 · 进阶', level: 2 },
  { index: 2, rows: 8, cols: 8, mines: 14, title: '第 3 关 · 挑战', level: 3 },
];

const RULES = ['within10', 'carry20', 'borrow20', 'mixedChain'] as const;

function key(r: number, c: number): string {
  return `${r},${c}`;
}

/** 随机布置 count 个雷，返回坐标集合（"r,c"） */
export function placeMines(rows: number, cols: number, count: number, rng: Rng): Set<string> {
  const all: Coord[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) all.push({ row: r, col: c });
  const chosen = shuffle(all, rng).slice(0, Math.min(count, all.length));
  return new Set(chosen.map((p) => key(p.row, p.col)));
}

/** 计算某格周围 8 格的雷数 */
export function countNeighborMines(
  rows: number,
  cols: number,
  mines: Set<string>,
  r: number,
  c: number,
): number {
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (mines.has(key(nr, nc))) n++;
    }
  }
  return n;
}

/** 为某格生成一道 20 以内加减算式（随机算理规则，便于收集进位加/退位减等知识点） */
function makeExpr(level: 1 | 2 | 3, rng: Rng, seed: number): MathExpr {
  const rule = pick(RULES as unknown as string[], rng) as string;
  return genExpression({ level, rule, seed: seed >>> 0 });
}

/** 选项主题上界：数字扫雷统一为「20 以内加减」，干扰项不得超过 20 */
const OPTION_MAX = 20;

/** 生成作答选项：正确答案 + 3 个不重复、非负、且与正确答案不同的干扰项。
 *  干扰项额外约束严格落在 [0, OPTION_MAX] 内，避免大答案（如 20）产生 21~24 等超界项。 */
export function makeOptions(answer: number, rng: Rng): number[] {
  const cands: number[] = [];
  for (const d of [1, -1, 2, -2, 3, -3]) {
    const v = answer + d;
    if (v >= 0 && v <= OPTION_MAX && v !== answer && !cands.includes(v)) cands.push(v);
  }
  const distract = shuffle(cands, rng).slice(0, 3);
  return shuffle([answer, ...distract], rng);
}

/**
 * 构建一局数字扫雷棋盘。
 * @param mineSet 可选：显式指定雷坐标（用于测试确定性验证邻居雷数）
 */
export function buildBoard(level: MinesLevel, seed: number, mineSet?: Coord[]): MinesBoard {
  const rng = createRng(seed);
  const total = level.rows * level.cols;
  const mines = mineSet
    ? new Set(mineSet.map((p) => key(p.row, p.col)))
    : placeMines(level.rows, level.cols, level.mines, rng);

  const cells: MinesCell[][] = [];
  let idx = 0;
  for (let r = 0; r < level.rows; r++) {
    const row: MinesCell[] = [];
    for (let c = 0; c < level.cols; c++) {
      const isMine = mines.has(key(r, c));
      const neighborMines = countNeighborMines(level.rows, level.cols, mines, r, c);
      const expr = makeExpr(level.level, rng, (seed * 2654435761 + idx * 40503) >>> 0);
      row.push({
        row: r,
        col: c,
        isMine,
        neighborMines,
        expr,
        revealed: false,
        opened: false,
        steppedMine: false,
        wrong: false,
      });
      idx++;
    }
    cells.push(row);
  }

  return {
    rows: level.rows,
    cols: level.cols,
    mines: mines.size,
    safeTotal: total - mines.size,
    cells,
  };
}

function cloneBoard(board: MinesBoard): MinesBoard {
  return {
    rows: board.rows,
    cols: board.cols,
    mines: board.mines,
    safeTotal: board.safeTotal,
    cells: board.cells.map((row) => row.map((cell) => ({ ...cell }))),
  };
}

export interface AnswerResult {
  board: MinesBoard;
  correct: boolean;
  isMine: boolean;
  /** 安全格答对时收集到的算理知识点（如 `math:carry20`） */
  knowledgePoint?: string;
}

/**
 * 玩家对某格作答：answer 为该格算式的解答。
 * - 答对：安全格 → 翻开 + 返回知识点；雷格 → 踩雷揭示（仍算“答对算式”但踩中雷）。
 * - 答错：标记 wrong（供抖动反馈），格子保持未翻开，可重试。
 */
export function applyAnswer(board: MinesBoard, r: number, c: number, answer: number): AnswerResult {
  const cell = board.cells[r][c];
  const correct = answer === cell.expr.answer;
  const nb = cloneBoard(board);
  const target = nb.cells[r][c];

  if (correct) {
    target.revealed = true;
    target.opened = true;
    target.wrong = false;
    if (cell.isMine) target.steppedMine = true;
    return {
      board: nb,
      correct: true,
      isMine: cell.isMine,
      knowledgePoint: cell.isMine ? undefined : cell.expr.knowledgePoint,
    };
  }
  target.wrong = true;
  return { board: nb, correct: false, isMine: cell.isMine };
}

/** 是否已通关：所有安全格均被成功翻开 */
export function isWin(board: MinesBoard): boolean {
  for (const row of board.cells) {
    for (const cell of row) {
      if (!cell.isMine && !cell.opened) return false;
    }
  }
  return true;
}

/** 已翻开的安全格数 */
export function openedSafeCount(board: MinesBoard): number {
  let n = 0;
  for (const row of board.cells) {
    for (const cell of row) {
      if (!cell.isMine && cell.opened) n++;
    }
  }
  return n;
}
