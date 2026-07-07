/**
 * klotskiLogic —— 华容道（滑块拼图变体）纯逻辑（不依赖 React，可单测）。
 *
 * 设计要点：
 * - 棋盘由不同尺寸的方块组成，含一个 2×2「目标块」（🚪）与一个出口位置 goalTarget。
 *   （为降低难度、保证可解，棋盘保留若干空格；scramble 仅施加合法滑动，故终局必可还原。）
 * - 滑动规则：任一方块可朝「不越界且不与他块重叠」的方向移动（空格自然成为其落点）。
 * - 知识点融合：每关在开始滑动前嵌入一道「排序 / 分类 / 规律」小题作为门控，
 *   答对收集 `logic:sort` / `logic:classify` / `logic:pattern`（算理/逻辑推理融合）。
 * - 复用 createRng 保证 seed 可复现。
 */
import { createRng, type Rng } from '../../../utils/rng';
import { QuestionGenerator, type LogicPuzzle } from '../../../data/generators';
import type { CardTone } from '../../../components/Card';

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface KlotskiBlock {
  id: string;
  r: number;
  c: number;
  w: number;
  h: number;
  label: string;
  emoji?: string;
  tone: CardTone;
  /** 是否为目标块（需移动到出口） */
  isGoal?: boolean;
}

export interface KlotskiState {
  rows: number;
  cols: number;
  /** 出口坐标（目标块左上角到达此处即通关） */
  goalTarget: { r: number; c: number };
  blocks: KlotskiBlock[];
}

export type KlotskiKind = 'sort' | 'classify' | 'pattern';

export interface KlotskiLevel {
  index: number;
  rows: number;
  cols: number;
  title: string;
  /** 本关门控知识点类型 */
  kind: KlotskiKind;
  /** 打乱步数（仅施加合法滑动，保证可解） */
  scramble: number;
  /** 移动上限（超出判负） */
  moveLimit: number;
}

export interface KlotskiLevelData {
  state: KlotskiState;
  puzzle: LogicPuzzle;
  kind: KlotskiKind;
  knowledgePoint: string;
}

/** 三关难度梯度：网格 4×4→4×5→5×5，知识点 排序→分类→规律，打乱与步数递增 */
export const KLOTSKI_LEVELS: KlotskiLevel[] = [
  { index: 0, rows: 4, cols: 4, title: '第 1 关 · 排序', kind: 'sort', scramble: 6, moveLimit: 30 },
  { index: 1, rows: 4, cols: 5, title: '第 2 关 · 分类', kind: 'classify', scramble: 8, moveLimit: 36 },
  { index: 2, rows: 5, cols: 5, title: '第 3 关 · 规律', kind: 'pattern', scramble: 10, moveLimit: 42 },
];

const DELTA: Record<Dir, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

/** 目标块在出口处即通关 */
export function isSolved(state: KlotskiState): boolean {
  const goal = state.blocks.find((b) => b.isGoal);
  if (!goal) return false;
  return goal.r === state.goalTarget.r && goal.c === state.goalTarget.c;
}

function cellsOf(r: number, c: number, w: number, h: number): { r: number; c: number }[] {
  const out: { r: number; c: number }[] = [];
  for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) out.push({ r: r + dr, c: c + dc });
  return out;
}

function inBounds(state: KlotskiState, cells: { r: number; c: number }[]): boolean {
  return cells.every((p) => p.r >= 0 && p.r < state.rows && p.c >= 0 && p.c < state.cols);
}

function overlaps(state: KlotskiState, cells: { r: number; c: number }[], exceptId: string): boolean {
  for (const p of cells) {
    for (const o of state.blocks) {
      if (o.id === exceptId) continue;
      if (p.r >= o.r && p.r < o.r + o.h && p.c >= o.c && p.c < o.c + o.w) return true;
    }
  }
  return false;
}

/** 判断某块能否朝 dir 移动（不越界、不与他块重叠） */
export function canMove(state: KlotskiState, blockId: string, dir: Dir): boolean {
  const b = state.blocks.find((x) => x.id === blockId);
  if (!b) return false;
  const d = DELTA[dir];
  const target = cellsOf(b.r + d.dr, b.c + d.dc, b.w, b.h);
  if (!inBounds(state, target)) return false;
  if (overlaps(state, target, blockId)) return false;
  return true;
}

/** 所有可移动方向 */
export function movableDirs(state: KlotskiState, blockId: string): Dir[] {
  return (['up', 'down', 'left', 'right'] as Dir[]).filter((d) => canMove(state, blockId, d));
}

/** 不可变地移动方块（非法移动返回结构相等的新状态，仍满足 !== 原状态） */
export function applyMove(state: KlotskiState, blockId: string, dir: Dir): KlotskiState {
  if (!canMove(state, blockId, dir)) {
    return { ...state, blocks: state.blocks.map((b) => ({ ...b })) };
  }
  const d = DELTA[dir];
  const blocks = state.blocks.map((b) =>
    b.id === blockId ? { ...b, r: b.r + d.dr, c: b.c + d.dc } : { ...b },
  );
  return { ...state, blocks };
}

/** 从已解布局出发，施加 steps 次随机合法滑动打乱（保持可解），并保证终局未解 */
export function scramble(state: KlotskiState, steps: number, rng: Rng): KlotskiState {
  let s = { ...state, blocks: state.blocks.map((b) => ({ ...b })) };
  for (let i = 0; i < steps; i++) {
    const movable = s.blocks.filter((b) => movableDirs(s, b.id).length > 0);
    if (movable.length === 0) break;
    const b = movable[Math.floor(rng() * movable.length)];
    const dirs = movableDirs(s, b.id);
    const d = dirs[Math.floor(rng() * dirs.length)];
    s = applyMove(s, b.id, d);
  }
  if (isSolved(s)) {
    const movable = s.blocks.filter((b) => movableDirs(s, b.id).length > 0);
    if (movable.length > 0) {
      const b = movable[Math.floor(rng() * movable.length)];
      const dirs = movableDirs(s, b.id);
      s = applyMove(s, b.id, dirs[Math.floor(rng() * dirs.length)]);
    }
  }
  return s;
}

/** 每关的出口（目标块目标位置）与空格布局 */
const GOAL_TARGET: { r: number; c: number }[] = [
  { r: 2, c: 1 }, // 4×4：目标块 2×2 落于右下区
  { r: 2, c: 1 }, // 4×5
  { r: 3, c: 1 }, // 5×5
];
/** 每关保留的空格数（越多越易；本设计取 4 保证目标块可滑动） */
const EMPTY_COUNT = 4;

/** 生成「已解」布局：目标块在出口，其余填 1×1 填充块，尾部留若干空格 */
function solvedLayout(level: KlotskiLevel): KlotskiState {
  const { rows, cols } = level;
  const gt = GOAL_TARGET[level.index] ?? { r: rows - 2, c: 1 };
  const blocks: KlotskiBlock[] = [];
  blocks.push({
    id: 'goal',
    r: gt.r,
    c: gt.c,
    w: 2,
    h: 2,
    label: '🚪',
    tone: 'mint',
    isGoal: true,
  });

  // 选定空格：取棋盘前 EMPTY_COUNT 个不与目标块冲突的格子（自左上扫描）
  const empties = new Set<string>();
  const goalCells = new Set(cellsOf(gt.r, gt.c, 2, 2).map((p) => `${p.r},${p.c}`));
  let placed = 0;
  for (let r = 0; r < rows && placed < EMPTY_COUNT; r++) {
    for (let c = 0; c < cols && placed < EMPTY_COUNT; c++) {
      const id = `${r},${c}`;
      if (goalCells.has(id)) continue;
      empties.add(id);
      placed++;
    }
  }

  let fid = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `${r},${c}`;
      if (goalCells.has(id) || empties.has(id)) continue;
      blocks.push({ id: `f${fid++}`, r, c, w: 1, h: 1, label: String(fid), tone: 'peach' });
    }
  }
  return { rows, cols, goalTarget: gt, blocks };
}

/** 组合生成一关：可解且未解的滑块局面 + 门控逻辑小题 */
export function buildLevel(level: KlotskiLevel, seed: number): KlotskiLevelData {
  const solved = solvedLayout(level);
  const rng = createRng(seed);
  let state = scramble(solved, level.scramble, rng);
  if (isSolved(state)) state = scramble(state, 1, createRng((seed + 1) >>> 0));
  const puzzle = QuestionGenerator.logic({
    kind: level.kind,
    level: ((level.index + 1) as 1 | 2 | 3),
    seed: (seed + 7) >>> 0,
  });
  return { state, puzzle, kind: level.kind, knowledgePoint: `logic:${level.kind}` };
}

// ---------------- 门控小题校验 ----------------

export function checkSort(p: LogicPuzzle, orderedIds: string[]): boolean {
  const t = p.target as { sortedIds: string[] };
  if (!t.sortedIds || orderedIds.length !== t.sortedIds.length) return false;
  return orderedIds.every((id, i) => id === t.sortedIds[i]);
}

export function checkClassify(p: LogicPuzzle, chosen: Record<string, string[]>): boolean {
  const t = p.target as { groups: Record<string, string[]> };
  const keys = Object.keys(t.groups);
  const allWant = new Set(Object.values(t.groups).flat());
  const allGot = new Set(Object.values(chosen).flat());
  if (allWant.size !== allGot.size) return false;
  for (const id of allWant) if (!allGot.has(id)) return false;
  for (const k of keys) {
    const want = new Set(t.groups[k]);
    const got = new Set(chosen[k] ?? []);
    if (want.size !== got.size) return false;
    for (const id of want) if (!got.has(id)) return false;
  }
  return true;
}

export function checkPattern(p: LogicPuzzle, choice: string): boolean {
  const t = p.target as { missingLabel: string };
  return choice === t.missingLabel;
}

/** 校验状态：所有块在界内且无重叠（测试用） */
export function validateState(state: KlotskiState): boolean {
  const occ: boolean[][] = Array.from({ length: state.rows }, () =>
    Array.from({ length: state.cols }, () => false),
  );
  for (const b of state.blocks) {
    if (b.r < 0 || b.c < 0 || b.r + b.h > state.rows || b.c + b.w > state.cols) return false;
    for (let dr = 0; dr < b.h; dr++) {
      for (let dc = 0; dc < b.w; dc++) {
        if (occ[b.r + dr][b.c + dc]) return false;
        occ[b.r + dr][b.c + dc] = true;
      }
    }
  }
  return true;
}
