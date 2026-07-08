/**
 * 抓大鹅纯逻辑测试（node 环境）。
 * 覆盖：pool 构建、round 构建、isMatch、GOOSE_LEVELS 梯度、固定 seed 可复现。
 */
import { describe, expect, it } from 'vitest';
import {
  buildPool,
  buildRound,
  isMatch,
  GOOSE_LEVELS,
  roundScore,
  type GooseTile,
} from '../games/_shared/goose/gooseCatchLogic';
import { createRng } from '../utils/rng';

describe('buildPool', () => {
  it('汉字模式：key = 拼音，知识点 = pinyin:xx，每个拼音唯一', () => {
    const pool = buildPool('hanzi', 123);
    expect(pool.length).toBeGreaterThan(0);
    const keys = pool.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length); // distinct keys
    for (const t of pool) {
      expect(t.key).toBeTruthy();
      expect(t.knowledgePoint).toBe(`pinyin:${t.key}`);
      expect(t.label).toBeTruthy();
      expect(t.tone).toBeDefined();
    }
  });

  it('英语模式：key = category，知识点 = category:xx，每个 category 唯一', () => {
    const pool = buildPool('english', 456);
    expect(pool.length).toBeGreaterThan(0);
    const keys = pool.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length); // distinct keys
    for (const t of pool) {
      expect(t.knowledgePoint).toBe(`category:${t.key}`);
      expect(t.label).toBeTruthy();
    }
  });

  it('固定 seed 可复现', () => {
    const p1 = buildPool('hanzi', 999);
    const p2 = buildPool('hanzi', 999);
    expect(p1.map((t) => t.key)).toEqual(p2.map((t) => t.key));
  });
});

describe('buildRound', () => {
  function tile(key: string, kp = `pinyin:${key}`): GooseTile {
    return { key, label: key, sub: key, emoji: '🐤', meaning: key, knowledgePoint: kp, tone: 'peach' };
  }

  it('返回 1 正确 + N 干扰 tile，且乱序', () => {
    const pool = [tile('ai'), tile('ei'), tile('ou'), tile('ao'), tile('iu')];
    const rng = createRng(42);
    const dists = ['ei', 'ou', 'ao'];
    const round = buildRound(pool, 'ai', dists, rng);
    expect(round.length).toBe(1 + dists.length);
    // 包含一个正确 tile
    const correctTiles = round.filter((t) => t.key === 'ai');
    expect(correctTiles.length).toBe(1);
    // 所有 tile 都在池中对应的 key 能找到
    for (const t of round) {
      expect(pool.some((p) => p.key === t.key)).toBe(true);
    }
  });

  it('目标 key 不在池中时返回占位 tile', () => {
    const pool = [tile('ai'), tile('ei')];
    const rng = createRng(1);
    const round = buildRound(pool, 'zzz', ['ei'], rng);
    expect(round.length).toBe(1);
    expect(round[0].key).toBe('zzz');
  });

  it('固定 seed 下 buildRound 可复现', () => {
    const pool = [tile('a'), tile('b'), tile('c'), tile('d'), tile('e')];
    const r1 = buildRound(pool, 'a', ['b', 'c'], createRng(77));
    const r2 = buildRound(pool, 'a', ['b', 'c'], createRng(77));
    expect(r1.map((t) => t.key)).toEqual(r2.map((t) => t.key));
  });
});

describe('isMatch', () => {
  function tile(key: string): GooseTile {
    return { key, label: key, sub: key, knowledgePoint: `kp:${key}`, tone: 'peach' };
  }

  it('key 相同 → true', () => {
    expect(isMatch(tile('ai'), 'ai')).toBe(true);
  });

  it('key 不同 → false', () => {
    expect(isMatch(tile('ai'), 'ei')).toBe(false);
  });
});

describe('GOOSE_LEVELS', () => {
  it('为 3 关，难度单调递进', () => {
    expect(GOOSE_LEVELS).toHaveLength(3);
    for (let i = 1; i < GOOSE_LEVELS.length; i++) {
      const prev = GOOSE_LEVELS[i - 1];
      const cur = GOOSE_LEVELS[i];
      expect(cur.rounds).toBeGreaterThan(prev.rounds);
      expect(cur.tilesPerRound).toBeGreaterThan(prev.tilesPerRound);
      expect(cur.targetScore).toBeGreaterThan(prev.targetScore);
      expect(cur.mistakeLimit).toBeGreaterThan(prev.mistakeLimit);
    }
  });

  it('第 1 关参数正确', () => {
    const lv = GOOSE_LEVELS[0];
    expect(lv.rounds).toBe(6);
    expect(lv.tilesPerRound).toBe(4);
    expect(lv.targetScore).toBe(180);
    expect(lv.mistakeLimit).toBe(3);
  });

  it('第 3 关参数正确', () => {
    const lv = GOOSE_LEVELS[2];
    expect(lv.rounds).toBe(10);
    expect(lv.tilesPerRound).toBe(8);
    expect(lv.targetScore).toBe(500);
    expect(lv.mistakeLimit).toBe(5);
  });
});

describe('roundScore', () => {
  it('正确匹配得 10 分', () => {
    expect(roundScore(0, true)).toBe(10);
    expect(roundScore(5, true)).toBe(10);
  });

  it('错误不得分', () => {
    expect(roundScore(0, false)).toBe(0);
  });
});
