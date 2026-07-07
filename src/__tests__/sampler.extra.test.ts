/**
 * QA 补充测试（严过关）· sampler 边界强化。
 * 工程师自测已覆盖正常抽题/可复现，但边界
 * 「level 不存在 / tag 不匹配 / 空数组」下应「不抛错、返回空」未被断言。
 */
import { describe, expect, it } from 'vitest';
import { pickRandom, pickN, pickByLevel, pickByTag } from '../data/sampler';
import { createRng } from '../utils/rng';

describe('pickByLevel · 边界', () => {
  const data = [
    { level: 1, v: 'x' },
    { level: 2, v: 'y' },
    { level: 1, v: 'z' },
  ];
  it('level 不存在时返回空数组（不抛错）', () => {
    const got = pickByLevel(data, 99, createRng(2));
    expect(got).toEqual([]);
  });
  it('没有任何项带 level 字段时返回空数组', () => {
    const got = pickByLevel([{ v: 'a' }, { v: 'b' }] as never, 1, createRng(2));
    expect(got).toEqual([]);
  });
});

describe('pickByTag · 边界', () => {
  const data = [
    { tags: ['fruit'], v: 'a' },
    { tags: ['veg'], v: 'b' },
  ];
  it('tag 不匹配时返回空数组（不抛错）', () => {
    expect(pickByTag(data, 'meat', createRng(3))).toEqual([]);
  });
  it('项无 tags 字段时返回空数组（不抛错）', () => {
    expect(pickByTag([{ v: 'a' }] as never, 'fruit', createRng(3))).toEqual([]);
  });
});

describe('pickN · 边界', () => {
  it('空数组返回空数组（不抛错）', () => {
    expect(pickN([], 3, createRng(1))).toEqual([]);
  });
  it('n 为负数时截断为 0（返回空数组，不抛错）', () => {
    expect(pickN(['a', 'b'], -5, createRng(1))).toEqual([]);
  });
});

describe('pickRandom · 空数组行为（记录现状）', () => {
  it('空数组抛错（工程师设计：调用方不应传空数组）', () => {
    expect(() => pickRandom([], createRng(1))).toThrow();
  });
});
