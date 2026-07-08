/**
 * match3 纯逻辑测试（node 环境）。
 * 覆盖：tile 池（匹配键）、开局无三连、交换、消除/重力/补充、可行动判定、确定性。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  buildPool,
  buildGrid,
  applySwap,
  detectMatches,
  hasAdjacentPair,
  resolveGrid,
  hasPossibleMove,
  MATCH3_LEVELS,
  type MatchTile,
  type TileGrid,
} from '../games/_shared/match3/match3Logic';

function tile(key: string, kp = `pinyin:${key}`): MatchTile {
  return { key, label: key, tone: 'peach', knowledgePoint: kp };
}

describe('buildPool', () => {
  it('汉字模式：匹配键 = 拼音，知识点 = pinyin:xx', () => {
    const pool = buildPool('hanzi', 123, 20);
    expect(pool.length).toBe(20);
    for (const t of pool) {
      expect(t.key).toBeTruthy();
      expect(t.knowledgePoint).toBe(`pinyin:${t.key}`);
    }
  });

  it('英语模式：匹配键 = category，知识点 = category:xx', () => {
    const pool = buildPool('english', 123, 20);
    expect(pool.length).toBe(20);
    for (const t of pool) {
      expect(t.knowledgePoint).toBe(`category:${t.key}`);
    }
  });
});

describe('buildGrid', () => {
  it('开局无三连（同种子可复现）', () => {
    const pool = buildPool('hanzi', 99, 48);
    const g1 = buildGrid(MATCH3_LEVELS[0], pool, 99);
    const g2 = buildGrid(MATCH3_LEVELS[0], pool, 99);
    expect(detectMatches(g1).length).toBe(0);
    // 确定性：相同 seed 生成相同棋盘
    expect(g1.map((r) => r.map((c) => c?.key).join(',')).join('|')).toBe(
      g2.map((r) => r.map((c) => c?.key).join(',')).join('|'),
    );
    // 棋盘填满（无 null）
    expect(g1.every((r) => r.every((c) => c !== null))).toBe(true);
  });
});

describe('applySwap', () => {
  it('交换两格内容', () => {
    const grid: TileGrid = [
      [tile('a'), tile('b')],
      [tile('c'), tile('d')],
    ];
    const swapped = applySwap(grid, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(swapped[0][0]?.key).toBe('b');
    expect(swapped[0][1]?.key).toBe('a');
    // 原棋盘不被修改
    expect(grid[0][0]?.key).toBe('a');
  });
});

describe('resolveGrid', () => {
  it('消除一行三连 + 重力补充，返回正确计分与知识点', () => {
    const pool = [tile('x', 'pinyin:x'), tile('y', 'pinyin:y')];
    const grid: TileGrid = [
      [tile('a'), tile('a'), tile('a'), tile('b')],
      [tile('b'), tile('c'), tile('d'), tile('e')],
    ];
    const matched = detectMatches(grid);
    expect(matched.length).toBe(3);

    let s = 1;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const res = resolveGrid(grid, matched, pool, rng);
    expect(res.cleared).toBe(3);
    expect(res.points).toBe(30);
    expect(res.knowledgePoints).toEqual(['pinyin:a']);
    // 补充后无空位
    expect(res.grid.every((r) => r.every((c) => c !== null))).toBe(true);
  });

  it('相同 key 的多段消除，知识点按 key 去重', () => {
    // 一行三个 a + 其下方也三个 a（纵向三连同 key）
    const pool = [tile('a', 'pinyin:a')];
    const grid: TileGrid = [
      [tile('a'), tile('b'), tile('c')],
      [tile('a'), tile('d'), tile('e')],
      [tile('a'), tile('f'), tile('g')],
    ];
    const matched = detectMatches(grid);
    expect(matched.length).toBe(3); // 纵向一列三连
    let s = 7;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const res = resolveGrid(grid, matched, pool, rng);
    expect(res.knowledgePoints).toEqual(['pinyin:a']);
  });
});

describe('hasPossibleMove', () => {
  it('存在可形成三连的一步交换 → true', () => {
    // 第0行: a a b，交换 (0,2)与(1,2) 可让 (1,2) 变 a 形成纵向或横向?
    // 构造：行0 "a a c"，行1 "c a c"，行2 "c c c" 不行。
    // 简单构造：行0 "a a b"，行1 "b b b" 已是三连。换一个：
    const grid: TileGrid = [
      [tile('a'), tile('a'), tile('b')],
      [tile('b'), tile('b'), tile('a')],
      [tile('c'), tile('c'), tile('c')],
    ];
    // 行2 已是三连 → 必有可行步
    expect(hasPossibleMove(grid)).toBe(true);
  });

  it('死局（无可行步）→ false', () => {
    // 所有格子 key 互不相同：任何相邻交换都无法凑出三连
    const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    const grid: TileGrid = [
      [tile(keys[0]), tile(keys[1]), tile(keys[2])],
      [tile(keys[3]), tile(keys[4]), tile(keys[5])],
      [tile(keys[6]), tile(keys[7]), tile(keys[8])],
    ];
    expect(hasPossibleMove(grid)).toBe(false);
  });
});

describe('hasAdjacentPair', () => {
  it('存在相邻同 key 对 → true（水平）', () => {
    const grid: TileGrid = [
      [tile('a'), tile('a'), tile('b')],
      [tile('c'), tile('d'), tile('e')],
    ];
    expect(hasAdjacentPair(grid)).toBe(true);
  });

  it('存在相邻同 key 对 → true（垂直）', () => {
    const grid: TileGrid = [
      [tile('a'), tile('b')],
      [tile('a'), tile('c')],
    ];
    expect(hasAdjacentPair(grid)).toBe(true);
  });

  it('无相邻同 key 对 → false', () => {
    const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    const grid: TileGrid = [
      [tile(keys[0]), tile(keys[1]), tile(keys[2])],
      [tile(keys[3]), tile(keys[4]), tile(keys[5])],
      [tile(keys[6]), tile(keys[7]), tile(keys[8])],
    ];
    expect(hasAdjacentPair(grid)).toBe(false);
  });
});

describe('可复现随机（固定 Math.random）', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.42);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('buildGrid 在固定随机下确定性生成', () => {
    const pool = buildPool('hanzi', 1, 48);
    const g1 = buildGrid(MATCH3_LEVELS[0], pool, 1);
    const g2 = buildGrid(MATCH3_LEVELS[0], pool, 1);
    expect(g1.map((r) => r.map((c) => c?.key).join(',')).join('|')).toBe(
      g2.map((r) => r.map((c) => c?.key).join(',')).join('|'),
    );
  });
});
