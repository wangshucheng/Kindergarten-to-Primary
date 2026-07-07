import { describe, it, expect } from 'vitest';
import {
  buildMatchRounds,
  buildVariantRounds,
  getSyllables,
} from '../games/pinyin/PinyinMatch/pinyinLogic';

const syl = getSyllables();

describe('PinyinMatch 拼读逻辑', () => {
  it('getSyllables 返回非空音节表', () => {
    expect(syl.length).toBeGreaterThan(0);
  });

  it('buildMatchRounds：轮数正确且每轮含正确声母/韵母', () => {
    const rounds = buildMatchRounds(syl, 5, 2024);
    expect(rounds.length).toBe(5);
    for (const r of rounds) {
      expect(r.initialOptions.length).toBe(4);
      expect(r.finalOptions.length).toBe(4);
      expect(r.initialOptions).toContain(r.target.initial);
      expect(r.finalOptions).toContain(r.target.final);
    }
  });

  it('buildMatchRounds：目标声母+韵母在数据中存在且拼出 target.pinyin', () => {
    const rounds = buildMatchRounds(syl, 8, 99);
    for (const r of rounds) {
      const match = syl.find(
        (s) => s.initial === r.target.initial && s.final === r.target.final,
      );
      expect(match).toBeDefined();
      expect(match!.pinyin).toBe(r.target.pinyin);
    }
  });

  it('buildMatchRounds：每轮有 3 个互异干扰项（错误选择可被判断）', () => {
    const rounds = buildMatchRounds(syl, 5, 2024);
    for (const r of rounds) {
      const distractors = r.initialOptions.filter((x) => x !== r.target.initial);
      expect(distractors.length).toBe(3);
      expect(new Set(distractors).size).toBe(3);
    }
  });

  it('buildVariantRounds：每轮含正确拼音选项', () => {
    const rounds = buildVariantRounds(syl, 6, 777);
    expect(rounds.length).toBe(6);
    for (const r of rounds) {
      expect(r.options.length).toBe(4);
      expect(r.options).toContain(r.target.pinyin);
    }
  });

  it('buildMatchRounds / buildVariantRounds：同种子可复现', () => {
    const a = buildMatchRounds(syl, 4, 555);
    const b = buildMatchRounds(syl, 4, 555);
    expect(a).toEqual(b);
    const c = buildVariantRounds(syl, 4, 555);
    const d = buildVariantRounds(syl, 4, 555);
    expect(c).toEqual(d);
  });

  it('多种子下选项均互异（去重修复后无重复值）', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const match = buildMatchRounds(syl, 5, seed);
      for (const r of match) {
        expect(new Set(r.initialOptions).size).toBe(r.initialOptions.length);
        expect(new Set(r.finalOptions).size).toBe(r.finalOptions.length);
      }
      const variant = buildVariantRounds(syl, 5, seed);
      for (const r of variant) {
        expect(new Set(r.options).size).toBe(r.options.length);
      }
    }
  });
});
