/**
 * DataLoader 合并测试（node 环境）。
 * 验证 base + ext 的「主键去重 + ext 优先 + 模块级缓存」。
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadHanzi,
  loadEnglish,
  loadPinyin,
  loadMathContent,
  __resetLoaderCache,
} from '../data/loader';

import hanziBase from '../data/hanzi.json';
import hanziExt from '../data/hanzi-ext.json';
import englishBase from '../data/english.json';
import englishExt from '../data/english-ext.json';
import pinyinBase from '../data/pinyin.json';
import pinyinExt from '../data/pinyin-full.json';

interface HanziRaw {
  char: string;
  pinyin: string;
}
interface EnglishRaw {
  word: string;
}
interface PinyinRaw {
  initials?: string[];
  finals?: string[];
  wholeSyllables?: string[];
  syllables?: { pinyin: string }[];
}

describe('loadHanzi：base.cards ∪ ext.chars（by char，ext 优先）', () => {
  afterEach(() => __resetLoaderCache());

  it('合并结果无重复 char，且包含 base 与 ext 全部主键', () => {
    const all = loadHanzi();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((e) => typeof e.char === 'string' && typeof e.pinyin === 'string')).toBe(true);

    const mergedChars = new Set(all.map((e) => e.char));
    expect(mergedChars.size).toBe(all.length); // 主键去重

    const baseChars = new Set((hanziBase as { cards: HanziRaw[] }).cards.map((c) => c.char));
    const extChars = new Set((hanziExt as { chars: HanziRaw[] }).chars.map((c) => c.char));
    for (const c of baseChars) expect(mergedChars.has(c)).toBe(true);
    for (const c of extChars) expect(mergedChars.has(c)).toBe(true);
  });
});

describe('loadEnglish：base.words ∪ ext.words（by word，ext 优先）', () => {
  afterEach(() => __resetLoaderCache());

  it('合并结果无重复 word，且包含 base 与 ext 全部主键', () => {
    const all = loadEnglish();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);

    const mergedWords = new Set(all.map((e) => e.word));
    expect(mergedWords.size).toBe(all.length);

    const baseWords = new Set((englishBase as { words: EnglishRaw[] }).words.map((w) => w.word));
    const extWords = new Set((englishExt as { words: EnglishRaw[] }).words.map((w) => w.word));
    for (const w of baseWords) expect(mergedWords.has(w)).toBe(true);
    for (const w of extWords) expect(mergedWords.has(w)).toBe(true);
  });
});

describe('loadPinyin：initials/finals/wholeSyllables 取并集，syllables by pinyin', () => {
  afterEach(() => __resetLoaderCache());

  it('initials/finals/wholeSyllables 覆盖 base 与 ext，syllables 去重', () => {
    const p = loadPinyin();
    expect(Array.isArray(p.initials)).toBe(true);
    expect(Array.isArray(p.finals)).toBe(true);
    expect(Array.isArray(p.wholeSyllables)).toBe(true);
    expect(Array.isArray(p.syllables)).toBe(true);

    const base = pinyinBase as PinyinRaw;
    const ext = pinyinExt as unknown as PinyinRaw;

    for (const s of base.initials ?? []) expect(p.initials).toContain(s);
    for (const s of ext.initials ?? []) expect(p.initials).toContain(s);
    for (const s of base.finals ?? []) expect(p.finals).toContain(s);
    for (const s of ext.finals ?? []) expect(p.finals).toContain(s);
    for (const s of ext.wholeSyllables ?? []) expect(p.wholeSyllables).toContain(s);

    const mergedPinyin = new Set(p.syllables.map((s) => s.pinyin));
    expect(mergedPinyin.size).toBe(p.syllables.length);

    for (const s of base.syllables ?? []) expect(mergedPinyin.has(s.pinyin)).toBe(true);
    for (const s of ext.syllables ?? []) expect(mergedPinyin.has(s.pinyin)).toBe(true);
  });
});

describe('loadMathContent：math.json 与 math-content.json 顶层浅合并', () => {
  afterEach(() => __resetLoaderCache());

  it('包含四则规则与逻辑生成维度', () => {
    const m = loadMathContent();
    expect(Object.keys(m.addSubtract).sort()).toEqual(
      ['borrow20', 'carry20', 'mixedChain', 'within10'].sort(),
    );
    expect(m.logic.sort.types.length).toBeGreaterThan(0);
    expect(m.logic.classify.examples.length).toBeGreaterThan(0);
    expect(m.logic.pattern.shapes.length).toBeGreaterThan(0);
  });
});

describe('__resetLoaderCache：重置模块级缓存', () => {
  it('重复调用不抛错且仍可返回数据', () => {
    expect(loadHanzi().length).toBeGreaterThan(0);
    __resetLoaderCache();
    expect(loadHanzi().length).toBeGreaterThan(0);
  });
});
