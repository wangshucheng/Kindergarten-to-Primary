/**
 * brickMatch 纯逻辑测试（node 环境）。
 * 覆盖：tile 池（key / knowledgePoint）、棋盘填满、连通块 flood-fill（含 size<2 边界）、
 * 不可变消除、重力补充无空位、关卡梯度、hasMoves 真假、固定种子可复现。
 */
import { describe, expect, it } from 'vitest';
import {
  BRICK_LEVELS,
  buildGrid,
  buildPool,
  findGroup,
  hasPossibleMove,
  resolveGrid,
  type BrickGrid,
  type BrickTile,
} from '../games/_shared/brick/brickMatchLogic';

function tile(key: string, kp = `pinyin:${key}`): BrickTile {
  return { key, label: key, tone: 'peach', knowledgePoint: kp };
}

describe('buildPool', () => {
  it('汉字模式：key 唯一，全部真实拼音无合成', () => {
    const pool = buildPool('hanzi', 123, 6);
    expect(pool.length).toBeGreaterThanOrEqual(8);
    const keys = new Set(pool.map((t) => t.key));
    expect(keys.size).toBe(pool.length);
    for (const t of pool) {
      expect(t.knowledgePoint).toBe(`hanzi:${t.label}`);
      expect(t.label).not.toMatch(/^k\d+$/); // 无 k0/k1 等合成方块
    }
  });

  it('英语模式：key 唯一，全部真实类别无合成', () => {
    const pool = buildPool('english', 123, 6);
    expect(pool.length).toBeGreaterThanOrEqual(2);
    const keys = new Set(pool.map((t) => t.key));
    expect(keys.size).toBe(pool.length);
    for (const t of pool) {
      expect(t.knowledgePoint).toBe(`category:${t.key}`);
      expect(t.label).not.toMatch(/^k\d+$/);
    }
  });
});

describe('buildGrid', () => {
  it('棋盘填满（无 null）且固定种子可复现', () => {
    const pool = buildPool('hanzi', 99, 6);
    const g1 = buildGrid(BRICK_LEVELS[0], pool, 99);
    const g2 = buildGrid(BRICK_LEVELS[0], pool, 99);
    expect(g1.every((row) => row.every((c) => c !== null))).toBe(true);
    const sig = (g: BrickGrid) => g.map((r) => r.map((c) => c?.key).join(',')).join('|');
    expect(sig(g1)).toBe(sig(g2));
  });
});

describe('findGroup', () => {
  it('4-邻域连通块正确（含 size<2 边界）', () => {
    const grid: BrickGrid = [
      [tile('b'), tile('b'), tile('b')],
      [tile('b'), tile('a'), tile('b')],
      [tile('b'), tile('b'), tile('b')],
    ];
    expect(findGroup(grid, { row: 1, col: 1 }).length).toBe(1);
  });

  it('同 key 相邻连通块聚合成一组', () => {
    const grid: BrickGrid = [
      [tile('a'), tile('a'), tile('b')],
      [tile('a'), tile('a'), tile('b')],
      [tile('b'), tile('b'), tile('b')],
    ];
    const group = findGroup(grid, { row: 0, col: 0 });
    expect(group.length).toBe(4);
  });
});

describe('resolveGrid', () => {
  it('消除连通块 + 重力补充，原棋盘不被修改，补充后无 null', () => {
    const pool = [tile('x', 'pinyin:x'), tile('y', 'pinyin:y')];
    const grid: BrickGrid = [
      [tile('a'), tile('a'), tile('a'), tile('b')],
      [tile('b'), tile('c'), tile('d'), tile('e')],
      [tile('f'), tile('g'), tile('h'), tile('i')],
    ];
    const group = findGroup(grid, { row: 0, col: 0 });
    expect(group.length).toBe(3);

    let s = 7;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const res = resolveGrid(grid, group, pool, rng);
    expect(grid[0][0]?.key).toBe('a'); // 原棋盘未被修改
    expect(res.grid.every((row) => row.every((c) => c !== null))).toBe(true);
    expect(res.cleared).toBe(3);
    expect(res.knowledgePoints).toEqual(['pinyin:a']);
  });
});

describe('hasPossibleMove', () => {
  it('存在 size≥2 连通块 → true', () => {
    const grid: BrickGrid = [
      [tile('a'), tile('a'), tile('b')],
      [tile('b'), tile('b'), tile('b')],
      [tile('c'), tile('c'), tile('c')],
    ];
    expect(hasPossibleMove(grid)).toBe(true);
  });

  it('棋盘格交替（无任意两块同 key 相邻）→ false', () => {
    const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    const grid: BrickGrid = [
      [tile(keys[0]), tile(keys[1]), tile(keys[2])],
      [tile(keys[3]), tile(keys[4]), tile(keys[5])],
      [tile(keys[6]), tile(keys[7]), tile(keys[8])],
    ];
    expect(hasPossibleMove(grid)).toBe(false);
  });
});

describe('BRICK_LEVELS 梯度', () => {
  it('3 关，网格 6→7→8，目标分与步数递增', () => {
    expect(BRICK_LEVELS.length).toBe(3);
    expect(BRICK_LEVELS.map((l) => l.rows)).toEqual([6, 7, 8]);
    expect(BRICK_LEVELS.map((l) => l.cols)).toEqual([6, 7, 8]);
    expect(BRICK_LEVELS.map((l) => l.targetScore)).toEqual([200, 360, 520]);
    expect(BRICK_LEVELS.map((l) => l.moves)).toEqual([20, 22, 24]);
  });
});
