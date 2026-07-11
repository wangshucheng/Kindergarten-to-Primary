/**
 * match3Logic —— 消消乐纯逻辑（不依赖 React，可单测）。
 *
 * 设计要点：
 * - 棋盘格子的“匹配键”由 subject 决定：汉字模式取「拼音」(相同拼音的汉字可三连)，
 *   英语模式取「category」(同类别单词三连)。知识点随匹配键收集（如 `pinyin:ai` / `category:color`）。
 * - 复用既有 `games/_shared/matchDetector` 的 detectMatch3 / isAdjacent 做三连判定。
 * - 建棋盘时确保“开局无三连”，消除后做重力下落 + 顶部补充；支持连锁（cascade）。
 * - 可复现：所有随机走 createRng(seed) + shuffle；测试可固定种子断言。
 */
import type { CardTone } from '../../../components/Card';
import type { Rng } from '../../../utils/rng';
import { createRng } from '../../../utils/rng';
import { shuffle } from '../../../utils/shuffle';
import { detectMatch3, type Coord } from '../matchDetector';
import { QuestionGenerator, type HanziQuestion } from '../../../data/generators';
import { vocabWordTiles } from '../../../data/vocabTiles';

/** 棋盘上的一块 tile */
export interface MatchTile {
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

export type TileGrid = (MatchTile | null)[][];

export type Match3Subject = 'hanzi' | 'english';

export interface Match3Level {
  index: number;
  rows: number;
  cols: number;
  /** 本关需达到的消除得分（达到即过关） */
  targetScore: number;
  /** 步数上限（一次有效交换消耗一步；无效交换不消耗） */
  moves: number;
  title: string;
}

/** 三关难度梯度：网格 6→7→8，目标分与步数递增 */
export const MATCH3_LEVELS: Match3Level[] = [
  { index: 0, rows: 6, cols: 6, targetScore: 200, moves: 20, title: '第 1 关 · 启蒙' },
  { index: 1, rows: 7, cols: 7, targetScore: 360, moves: 22, title: '第 2 关 · 进阶' },
  { index: 2, rows: 8, cols: 8, targetScore: 520, moves: 24, title: '第 3 关 · 挑战' },
];

const TONES: CardTone[] = ['peach', 'mint', 'sky', 'lemon', 'cream'];

/** 由字符串稳定映射到 5 种色调之一，保证相同 key 同色 */
function toneFor(key: string): CardTone {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

/** 依据 subject 构建 tile 池（从题库/生成器取素材，key 即匹配维度） */
export function buildPool(subject: Match3Subject, seed: number, count: number): MatchTile[] {
  if (subject === 'english') {
    // 英语实例统一从「核心词汇 VOCAB」取词（word/meaning 来自 VOCAB，emoji 回退原图/主题色）
    return vocabWordTiles(count, seed).map((t) => ({ ...t, tone: toneFor(t.key) }));
  }
  const qs: HanziQuestion[] = QuestionGenerator.hanzi({
    level: 1,
    mode: 'char-pinyin',
    count,
    seed,
  });
  return qs.map((q) => ({
    key: q.pinyin,
    label: q.char,
    sub: q.pinyin,
    emoji: q.emoji,
    meaning: q.meaning,
    // M4：知识点统一为 `hanzi:字`（与 genHanzi 契约一致，避免同音字合并失真）
    knowledgePoint: `hanzi:${q.char}`,
    tone: toneFor(q.pinyin),
  }));
}

function spawnTile(pool: MatchTile[], rng: Rng): MatchTile {
  const t = pool[Math.floor(rng() * pool.length)];
  return { ...t };
}

/** 匹配相等判定：非空格且 key 相同 */
export function keyEq(a: MatchTile | null, b: MatchTile | null): boolean {
  return !!a && !!b && a.key === b.key;
}

/** 交换两格，返回新棋盘（不修改原棋盘） */
export function applySwap(grid: TileGrid, a: Coord, b: Coord): TileGrid {
  const next = grid.map((row) => row.slice());
  const t = next[a.row][a.col];
  next[a.row][a.col] = next[b.row][b.col];
  next[b.row][b.col] = t;
  return next;
}

/** 检测当前棋盘所有三连坐标 */
export function detectMatches(grid: TileGrid): Coord[] {
  return detectMatch3(grid, keyEq);
}

/** 生成初始棋盘（确保开局无三连） */
export function buildGrid(level: Match3Level, pool: MatchTile[], seed: number): TileGrid {
  const rng = createRng(seed);
  const grid: TileGrid = [];
  for (let r = 0; r < level.rows; r++) {
    const row: (MatchTile | null)[] = [];
    for (let c = 0; c < level.cols; c++) row.push(spawnTile(pool, rng));
    grid.push(row);
  }
  // 消除开局三连：反复重掷参与三连的格子，直至稳定
  let guard = 0;
  while (guard++ < 300) {
    const m = detectMatches(grid);
    if (m.length === 0) break;
    for (const c of m) grid[c.row][c.col] = spawnTile(pool, rng);
  }
  return grid;
}

export interface ResolveResult {
  grid: TileGrid;
  /** 本次消除的 tile 数 */
  cleared: number;
  /** 本次消除得分 */
  points: number;
  /** 本次消除涉及的知识点（按 key 去重） */
  knowledgePoints: string[];
}

/**
 * 消除给定坐标、做重力下落 + 顶部补充，返回新棋盘与计分信息。
 * 分数 = 消除块数 × 10；知识点按 key 去重收集。
 */
export function resolveGrid(grid: TileGrid, matched: Coord[], pool: MatchTile[], rng: Rng): ResolveResult {
  const rows = grid.length;
  const cols = grid[0].length;
  const matchedSet = new Set(matched.map((c) => `${c.row},${c.col}`));
  const kps = new Set<string>();
  const next = grid.map((row) => row.slice());

  for (const c of matched) {
    const t = next[c.row][c.col];
    if (t) kps.add(t.knowledgePoint);
    next[c.row][c.col] = null;
  }

  // 逐列重力：非空格沉底，顶部用新 tile 补充
  for (let col = 0; col < cols; col++) {
    const stack: MatchTile[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      const t = next[r][col];
      if (t) stack.push(t);
    }
    for (let r = rows - 1, i = 0; r >= 0; r--, i++) {
      next[r][col] = i < stack.length ? stack[i] : spawnTile(pool, rng);
    }
  }

  const cleared = matched.length;
  return {
    grid: next,
    cleared,
    points: cleared * 10,
    knowledgePoints: Array.from(kps),
  };
}

/** 是否存在“任意一次相邻交换即可形成三连”的可行步（无则代表死局，需重排） */
export function hasPossibleMove(grid: TileGrid): boolean {
  const rows = grid.length;
  const cols = grid[0].length;
  const tryAt = (r1: number, c1: number, r2: number, c2: number): boolean => {
    const g = grid.map((row) => row.slice());
    const t = g[r1][c1];
    g[r1][c1] = g[r2][c2];
    g[r2][c2] = t;
    return detectMatches(g).length > 0;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols && tryAt(r, c, r, c + 1)) return true;
      if (r + 1 < rows && tryAt(r, c, r + 1, c)) return true;
    }
  }
  return false;
}

/** 是否存在任意两个相邻且同 key 的 tile（「二连消除」模式：无需交换，直接点选配对） */
export function hasAdjacentPair(grid: TileGrid): boolean {
  const rows = grid.length;
  if (rows === 0) return false;
  const cols = grid[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = grid[r][c];
      if (!t) continue;
      if (c + 1 < cols && grid[r][c + 1]?.key === t.key) return true;
      if (r + 1 < rows && grid[r + 1][c]?.key === t.key) return true;
    }
  }
  return false;
}

/** 若棋盘死局则重排（保持无开局三连） */
export function ensurePlayable(level: Match3Level, grid: TileGrid, pool: MatchTile[], seed: number): TileGrid {
  if (hasPossibleMove(grid)) return grid;
  return buildGrid(level, pool, seed ^ 0x9e3779b9);
}
