/**
 * match3 补充测试（覆盖第 2 批 QA 充分性审查缺口，仅新增用例、不改源码）。
 * 覆盖：detectMatch3 横/纵/多连、交换仅当形成三连才消除、重力不丢格不越界、
 * 级联 cascade 机制、死局重排 ensurePlayable、关卡梯度 MATCH3_LEVELS。
 */
import { describe, expect, it } from 'vitest';
import {
  buildPool,
  buildGrid,
  applySwap,
  detectMatches,
  resolveGrid,
  hasPossibleMove,
  ensurePlayable,
  MATCH3_LEVELS,
  type MatchTile,
  type TileGrid,
} from '../games/_shared/match3/match3Logic';

function tile(key: string, kp = `pinyin:${key}`): MatchTile {
  return { key, label: key, tone: 'peach', knowledgePoint: kp };
}

/** 反复消除直到稳定，模拟组件内 cascade 循环（纯逻辑层） */
function resolveAll(grid: TileGrid, pool: MatchTile[], rng: () => number, maxIter = 40) {
  let cur = grid;
  let iter = 0;
  const clearedPerIter: number[] = [];
  while (iter++ < maxIter) {
    const m = detectMatches(cur);
    if (m.length === 0) break;
    const res = resolveGrid(cur, m, pool, rng);
    clearedPerIter.push(res.cleared);
    cur = res.grid;
  }
  return { grid: cur, clearedPerIter, iters: iter, terminated: iter <= maxIter };
}

describe('detectMatches —— 横/纵/多连', () => {
  it('横向长度 4：返回 4 个坐标且都在第 0 行', () => {
    const grid: TileGrid = [
      [tile('a'), tile('a'), tile('a'), tile('a'), tile('b')],
      [tile('c'), tile('d'), tile('e'), tile('f'), tile('g')],
    ];
    const m = detectMatches(grid);
    expect(m.length).toBe(4);
    expect(m.every((c) => c.row === 0)).toBe(true);
  });

  it('纵向 3 连：返回该列的 3 个坐标', () => {
    const grid: TileGrid = [
      [tile('a'), tile('b'), tile('c')],
      [tile('a'), tile('d'), tile('e')],
      [tile('a'), tile('f'), tile('g')],
    ];
    const m = detectMatches(grid);
    expect(m.length).toBe(3);
    expect(m.every((c) => c.col === 0)).toBe(true);
  });

  it('横向 + 纵向同时存在（共享角）：返回去重后的 5 个坐标', () => {
    const grid: TileGrid = [
      [tile('a'), tile('a'), tile('a')],
      [tile('a'), tile('b'), tile('c')],
      [tile('a'), tile('d'), tile('e')],
    ];
    // 第0行横连3 + 第0列纵连3，共享 (0,0)
    const m = detectMatches(grid);
    expect(m.length).toBe(5);
  });
});

describe('applySwap —— 仅当形成三连才消除', () => {
  it('交换形成三连 → detectMatches > 0（会消除）', () => {
    const grid: TileGrid = [
      [tile('a'), tile('a'), tile('b')],
      [tile('c'), tile('d'), tile('a')],
    ];
    // 交换 (0,2) 与 (1,2)：b↔a → 第0行变成 a a a
    const swapped = applySwap(grid, { row: 0, col: 2 }, { row: 1, col: 2 });
    expect(detectMatches(swapped).length).toBe(3);
  });

  it('交换不形成三连 → detectMatches == 0（不消除，符合组件无效交换逻辑）', () => {
    const grid: TileGrid = [
      [tile('a'), tile('a'), tile('b')],
      [tile('c'), tile('d'), tile('e')],
      [tile('f'), tile('g'), tile('h')],
    ];
    const swapped = applySwap(grid, { row: 0, col: 2 }, { row: 1, col: 2 });
    // 交换后第0行 a a e，第1行 c d b — 无三连
    expect(detectMatches(swapped).length).toBe(0);
  });
});

describe('resolveGrid —— 重力不丢格、不越界', () => {
  it('消除后棋盘填满（无 null），且坐标均在界内', () => {
    const pool = [tile('x', 'pinyin:x'), tile('y', 'pinyin:y')];
    const grid: TileGrid = [
      [tile('a'), tile('a'), tile('a'), tile('b')],
      [tile('b'), tile('c'), tile('d'), tile('e')],
      [tile('f'), tile('g'), tile('h'), tile('i')],
    ];
    const matched = detectMatches(grid);
    let s = 1;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const res = resolveGrid(grid, matched, pool, rng);
    // 无空位
    expect(res.grid.every((r) => r.every((c) => c !== null))).toBe(true);
    // 无越界：行/列数不变
    expect(res.grid.length).toBe(3);
    expect(res.grid.every((r) => r.length === 4)).toBe(true);
  });
});

describe('cascade 级联机制（组件内循环的逻辑等价）', () => {
  it('消除后下落产生新三连 → 级联继续，最终终止且棋盘填满', () => {
    // pool 仅 3 种 tile；用确定性 rng 精确控制顶部补充，构造一次可控级联。
    const pool = [tile('a', 'pinyin:a'), tile('b', 'pinyin:b'), tile('c', 'pinyin:c')];
    const grid: TileGrid = [
      [tile('a'), tile('a'), tile('a')], // 初始横连，将被消除
      [tile('b'), tile('c'), tile('b')],
      [tile('c'), tile('b'), tile('c')],
    ];
    // 第1次级联补充(a,a,a → 第0行再成连) + 第2级补充(c,b,c → 不再成连)
    const seq = [0.1, 0.1, 0.1, 0.9, 0.5, 0.9]; // a,a,a,c,b,c
    let si = 0;
    const rng = () => seq[si++ % seq.length];
    const { clearedPerIter, iters, terminated, grid: final } = resolveAll(grid, pool, rng);
    expect(terminated).toBe(true);
    expect(clearedPerIter.length).toBeGreaterThanOrEqual(2); // 至少发生一次级联
    // 最终棋盘填满、无越界
    expect(final.every((r) => r.every((c) => c !== null))).toBe(true);
    expect(final.length).toBe(3);
  });

  it('在真实随机棋盘上注入一次三连，cascade 循环始终终止且不丢格（多样本）', () => {
    // 该用例验证“消除→重力→补充→再检测”循环在真实棋盘上：必定终止、不丢格、不越界。
    // 级联(cascade)的正确性由上一个确定性用例直接覆盖（clearedPerIter.length >= 2）。
    for (let seed = 1; seed <= 8; seed++) {
      const pool = buildPool('hanzi', seed, 48);
      const g0 = buildGrid(MATCH3_LEVELS[0], pool, seed);
      const injected: TileGrid = g0.map((r) => r.slice());
      injected[0][0] = { ...pool[0] };
      injected[0][1] = { ...pool[0] };
      injected[0][2] = { ...pool[0] };
      let s = seed * 7 + 1;
      const rng = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
      };
      const { terminated, grid: final } = resolveAll(injected, pool, rng);
      expect(terminated).toBe(true);
      expect(final.every((r) => r.every((c) => c !== null))).toBe(true);
      expect(final.length).toBe(MATCH3_LEVELS[0].rows);
    }
  });
});

describe('ensurePlayable —— 死局重排 / 活局不重排', () => {
  it('棋局可解（存在可行步）→ 原样返回，不重排', () => {
    // 含一行三连的棋盘必可解
    const pool = [tile('a'), tile('b'), tile('c'), tile('d')];
    const grid: TileGrid = [
      [tile('a'), tile('a'), tile('a')],
      [tile('b'), tile('c'), tile('d')],
      [tile('e'), tile('f'), tile('g')],
    ];
    expect(hasPossibleMove(grid)).toBe(true);
    const out = ensurePlayable(MATCH3_LEVELS[0], grid, pool, 123);
    expect(out).toBe(grid); // 同一引用，未重建
  });

  it('死局（无可行步）→ 重排为开局无三连的新棋盘', () => {
    // 构造 6x6 全不相同 key 的死局
    const pool: MatchTile[] = [];
    for (let i = 0; i < 36; i++) pool.push(tile(`k${i}`));
    const dead: TileGrid = [];
    let k = 0;
    for (let r = 0; r < 6; r++) {
      const row: (MatchTile | null)[] = [];
      for (let c = 0; c < 6; c++) row.push(pool[k++]);
      dead.push(row);
    }
    expect(hasPossibleMove(dead)).toBe(false);
    const rebuilt = ensurePlayable(MATCH3_LEVELS[0], dead, pool, 999);
    // 重排后是新棋盘且开局无三连、棋盘填满
    expect(rebuilt).not.toBe(dead);
    expect(detectMatches(rebuilt).length).toBe(0);
    expect(rebuilt.every((r) => r.every((c) => c !== null))).toBe(true);
  });
});

describe('MATCH3_LEVELS —— 难度梯度合理', () => {
  it('网格/目标分/步数随关卡严格递增，索引连续', () => {
    expect(MATCH3_LEVELS.map((l) => l.index)).toEqual([0, 1, 2]);
    const rows = MATCH3_LEVELS.map((l) => l.rows);
    const cols = MATCH3_LEVELS.map((l) => l.cols);
    const target = MATCH3_LEVELS.map((l) => l.targetScore);
    const moves = MATCH3_LEVELS.map((l) => l.moves);
    // 严格递增
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]).toBeGreaterThan(rows[i - 1]);
      expect(cols[i]).toBeGreaterThan(cols[i - 1]);
      expect(target[i]).toBeGreaterThan(target[i - 1]);
      expect(moves[i]).toBeGreaterThan(moves[i - 1]);
    }
    // 网格从 6 起、目标分与步数为正
    expect(MATCH3_LEVELS[0].rows).toBe(6);
    expect(MATCH3_LEVELS[0].cols).toBe(6);
    expect(MATCH3_LEVELS[2].rows).toBe(8);
    expect(MATCH3_LEVELS.every((l) => l.targetScore > 0 && l.moves > 0)).toBe(true);
  });

  it('buildGrid 在梯度各关均开局无三连且填满', () => {
    const pool = buildPool('hanzi', 7, 64);
    for (const lv of MATCH3_LEVELS) {
      const g = buildGrid(lv, pool, 7);
      expect(g.length).toBe(lv.rows);
      expect(detectMatches(g).length).toBe(0);
      expect(g.every((r) => r.length === lv.cols && r.every((c) => c !== null))).toBe(true);
    }
  });
});
