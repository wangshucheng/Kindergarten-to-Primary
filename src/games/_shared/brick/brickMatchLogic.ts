/**
 * brickMatchLogic —— 「砖了个砖 / PopStar 点群消除」纯逻辑（不依赖 React，可单测）。
 *
 * 设计要点：
 * - 棋盘由若干「同 key」方块组成；点击一个方块，若它与上下左右相邻同 key 方块
 *   构成 size≥2 的连通块，则整块消除、上方下落、顶部补充新块。
 * - 学科融合：汉字模式 key=拼音（知识点 pinyin:xx）、英语模式 key=category（知识点 category:xx）。
 * - 复用既有 Rng（createRng）保证 seed 可复现；所有随机走 pool 抽样，测试可固定种子断言。
 */
import type { CardTone } from '../../../components/Card';
import { createRng } from '../../../utils/rng';
import { QuestionGenerator, type EnglishQuestion, type HanziQuestion } from '../../../data/generators';
import type { Coord } from '../matchDetector';

/** 棋盘上的一块砖 */
export interface BrickTile {
  /** 匹配键：汉字=拼音；英语=category */
  key: string;
  /** 主显示：汉字 / 单词 */
  label: string;
  /** 副显示：拼音 / 释义 */
  sub?: string;
  emoji?: string;
  /** 消除时收集的知识点 id（如 `pinyin:ai` / `category:color`） */
  knowledgePoint: string;
  /** 汉字模式附带释义，用于消除时展示 */
  meaning?: string;
  /** 视觉色调（相同 key 固定同色，便于幼儿识别“同类”） */
  tone: CardTone;
}

export type BrickGrid = (BrickTile | null)[][];

export type BrickSubject = 'hanzi' | 'english';

export interface BrickLevel {
  index: number;
  rows: number;
  cols: number;
  /** 本关需达到的消除得分（达到即过关） */
  targetScore: number;
  /** 步数上限（一次有效消除消耗一步；无效点击不消耗） */
  moves: number;
  title: string;
}

/** 三关难度梯度：网格 6→7→8，目标分与步数递增（仿 MATCH3_LEVELS） */
export const BRICK_LEVELS: BrickLevel[] = [
  { index: 0, rows: 6, cols: 6, targetScore: 200, moves: 20, title: '第 1 关 · 启蒙' },
  { index: 1, rows: 7, cols: 7, targetScore: 360, moves: 22, title: '第 2 关 · 进阶' },
  { index: 2, rows: 8, cols: 8, targetScore: 520, moves: 24, title: '第 3 关 · 挑战' },
];

const TONES: CardTone[] = ['peach', 'mint', 'sky', 'lemon', 'cream'];

/** 由字符串稳定映射到色调，保证相同 key 同色 */
function toneFor(key: string): CardTone {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

/**
 * 构建 tile 池（按 key 去重）。
 * - 汉字：取若干不同拼音（label=代表字，sub=拼音，meaning=释义，knowledgePoint=`pinyin:拼音`）。
 * - 英语：取若干不同 category（label=代表词，sub=释义，knowledgePoint=`category:类别`）。
 * 返回去重后的 tile 列表（长度 >= 24，保证内容足够丰富）。
 */
export function buildPool(subject: BrickSubject, seed: number, count: number): BrickTile[] {
  const map = new Map<string, BrickTile>();
  const addTile = (t: BrickTile) => {
    if (!map.has(t.key)) map.set(t.key, t);
  };

  const want = Math.max(24, count);
  if (subject === 'english') {
    for (let attempt = 0; attempt < 16 && map.size < want; attempt++) {
      const qs: EnglishQuestion[] = QuestionGenerator.english({
        level: 1,
        count: 40,
        seed: seed + attempt * 97,
      });
      for (const q of qs) {
        const cat = q.category ?? 'misc';
        addTile({
          key: cat,
          label: q.word,
          sub: q.meaning,
          emoji: q.emoji,
          knowledgePoint: `category:${cat}`,
          tone: toneFor(cat),
        });
      }
    }
  } else {
    for (let attempt = 0; attempt < 16 && map.size < want; attempt++) {
      const qs: HanziQuestion[] = QuestionGenerator.hanzi({
        level: 1,
        mode: 'char-pinyin',
        count: 40,
        seed: seed + attempt * 131,
      });
      for (const q of qs) {
        addTile({
          key: q.pinyin,
          label: q.char,
          sub: q.pinyin,
          emoji: q.emoji,
          meaning: q.meaning,
          knowledgePoint: `pinyin:${q.pinyin}`,
          tone: toneFor(q.pinyin),
        });
      }
    }
  }

  // 兜底：极端情况下生成器不足 24 个，用序号补齐，保证每个 key 唯一且可消除
  let i = 0;
  while (map.size < want) {
    const k = `k${i++}`;
    addTile({ key: k, label: k, sub: k, knowledgePoint: `fill:${k}`, tone: toneFor(k) });
  }
  return Array.from(map.values());
}

function spawnTile(pool: BrickTile[], rng: () => number): BrickTile {
  const t = pool[Math.floor(rng() * pool.length)];
  return { ...t };
}

/** 从 pool 中挑选一个小调色板（少量不同 key），保证棋盘同 key 相邻成组 */
function paletteOf(pool: BrickTile[]): BrickTile[] {
  const n = Math.min(8, pool.length);
  return pool.slice(0, n);
}

/** 生成初始棋盘：rows×cols 用调色板随机填充，保证开局有可消步 */
export function buildGrid(level: BrickLevel, pool: BrickTile[], seed: number): BrickGrid {
  const rng0 = createRng(seed);
  const palette = paletteOf(pool);
  let grid: BrickGrid = [];
  let rng = rng0;
  let guard = 0;
  do {
    grid = [];
    for (let r = 0; r < level.rows; r++) {
      const row: (BrickTile | null)[] = [];
      for (let c = 0; c < level.cols; c++) row.push(spawnTile(palette, rng));
      grid.push(row);
    }
    if (hasPossibleMove(grid)) break;
    rng = createRng((seed ^ (0x9e3779b9 * (guard + 1))) >>> 0);
  } while (guard++ < 50);
  return grid;
}

/** 4-邻域 flood-fill：返回与 start 同 key 的连通坐标（至少含自身；start 为 null 返回 []） */
export function findGroup(grid: BrickGrid, start: Coord): Coord[] {
  const rows = grid.length;
  if (rows === 0) return [];
  const cols = grid[0].length;
  const t0 = grid[start.row]?.[start.col];
  if (!t0) return [];
  const key = t0.key;
  const seen = new Set<string>();
  const stack: Coord[] = [{ row: start.row, col: start.col }];
  const out: Coord[] = [];
  seen.add(`${start.row},${start.col}`);
  while (stack.length) {
    const cur = stack.pop()!;
    out.push(cur);
    const neighbors: Coord[] = [
      { row: cur.row - 1, col: cur.col },
      { row: cur.row + 1, col: cur.col },
      { row: cur.row, col: cur.col - 1 },
      { row: cur.row, col: cur.col + 1 },
    ];
    for (const n of neighbors) {
      if (n.row < 0 || n.row >= rows || n.col < 0 || n.col >= cols) continue;
      const id = `${n.row},${n.col}`;
      if (seen.has(id)) continue;
      const t = grid[n.row][n.col];
      if (t && t.key === key) {
        seen.add(id);
        stack.push(n);
      }
    }
  }
  return out;
}

/** 非空格下沉到底，顶部空位用 pool 随机补充（逐列独立） */
function applyGravity(grid: BrickGrid, rng: () => number, pool: BrickTile[]): BrickGrid {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const next = grid.map((row) => row.slice());
  for (let col = 0; col < cols; col++) {
    const stack: BrickTile[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      const t = next[r][col];
      if (t) stack.push(t);
    }
    for (let r = rows - 1, i = 0; r >= 0; r--, i++) {
      next[r][col] = i < stack.length ? stack[i] : spawnTile(pool, rng);
    }
  }
  return next;
}

function clearCells(grid: BrickGrid, group: Coord[]): BrickGrid {
  const next = grid.map((row) => row.slice());
  for (const c of group) {
    if (next[c.row]?.[c.col]) next[c.row][c.col] = null;
  }
  return next;
}

export interface BrickClearResult {
  grid: BrickGrid;
  /** 本次消除的 tile 数 */
  cleared: number;
  /** 本次消除得分（= 消除块数 × 10，≥5 块额外奖励 10） */
  points: number;
  /** 本次消除涉及的知识点（组的 key 单一，去重后最多 1 个） */
  knowledgePoints: string[];
}

/**
 * 消除指定连通块、做重力下落 + 顶部补充，返回新棋盘与计分信息。
 * 不可变更新；分数 = 消除块数 × 10，≥5 块额外 +10。
 */
export function resolveGrid(
  grid: BrickGrid,
  matched: Coord[],
  pool: BrickTile[],
  rng: () => number,
): BrickClearResult {
  const cleared = matched.length;
  const first = grid[matched[0].row][matched[0].col];
  const kp = first ? [first.knowledgePoint] : [];
  const base = cleared * 10;
  const bonus = cleared >= 5 ? 10 : 0;
  const next = applyGravity(clearCells(grid, matched), rng, pool);
  return { grid: next, cleared, points: base + bonus, knowledgePoints: kp };
}

/** 两 tile 是否同键（含 null 处理） */
export function keyEq(a: BrickTile | null, b: BrickTile | null): boolean {
  if (!a || !b) return false;
  return a.key === b.key;
}

/** 是否存在任意 size≥2 的连通块（有则可玩） */
export function hasPossibleMove(grid: BrickGrid): boolean {
  const rows = grid.length;
  if (rows === 0) return false;
  const cols = grid[0].length;
  const seen = new Set<string>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `${r},${c}`;
      if (seen.has(id)) continue;
      const t = grid[r][c];
      if (!t) {
        seen.add(id);
        continue;
      }
      const group = findGroup(grid, { row: r, col: c });
      for (const g of group) seen.add(`${g.row},${g.col}`);
      if (group.length >= 2) return true;
    }
  }
  return false;
}

/** 若棋盘无可消步则重排（保持有可消步） */
export function ensurePlayable(level: BrickLevel, grid: BrickGrid, pool: BrickTile[], seed: number): BrickGrid {
  if (hasPossibleMove(grid)) return grid;
  return buildGrid(level, pool, (seed ^ 0x85ebca6b) >>> 0);
}
