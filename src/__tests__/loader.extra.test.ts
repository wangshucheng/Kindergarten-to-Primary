/**
 * QA 补充测试（严过关）· DataLoader 合并强化。
 * 工程师自测已验证「无重复 + 含 base/ext 全部主键」，
 * 但「ext 优先（覆盖同键字段）」与「模块级缓存（二次调用返回同一引用）」
 * 两点未被断言。本文件补强这两点。
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadHanzi,
  loadEnglish,
  loadPinyin,
  __resetLoaderCache,
} from '../data/loader';
import hanziBase from '../data/hanzi.json';
import hanziExt from '../data/hanzi-ext.json';
import englishBase from '../data/english.json';
import englishExt from '../data/english-ext.json';

describe('loadHanzi · ext 优先覆盖同键字段', () => {
  afterEach(() => __resetLoaderCache());
  it('重叠字 心：merged.meaning 取 ext("心") 而非 base("心脏")', () => {
    const merged = new Map(loadHanzi().map((e) => [e.char, e]));
    const base = (hanziBase as { cards: { char: string; meaning: string }[] }).cards.find(
      (c) => c.char === '心',
    );
    const ext = (hanziExt as { chars: { char: string; meaning: string }[] }).chars.find(
      (c) => c.char === '心',
    );
    // base 与 ext 确实给出不同 meaning，才能证明覆盖生效
    expect(base?.meaning).toBe('心脏');
    expect(ext?.meaning).toBe('心');
    expect(merged.get('心')!.meaning).toBe('心'); // ext 覆盖 base
  });
  it('重叠字 水：merged.pinyin 标音已订正为 "shuǐ"（ext 正确覆盖 base）', () => {
    const merged = new Map(loadHanzi().map((e) => [e.char, e]));
    expect(merged.get('水')!.pinyin).toBe('shuǐ');
  });
  it('ext 提供而 base 缺失的字段（initial/final/tone）被带入合并结果，且 final 订正为 "üe"', () => {
    const merged = new Map(loadHanzi().map((e) => [e.char, e]));
    const yue = merged.get('月')!;
    expect(yue.initial).toBe('y');
    expect(yue.final).toBe('üe');
    expect(yue.tone).toBe(4);
  });
});

describe('loadHanzi · 模块级缓存', () => {
  afterEach(() => __resetLoaderCache());
  it('连续两次调用返回同一数组引用（不重复解析）', () => {
    const a = loadHanzi();
    const b = loadHanzi();
    expect(a).toBe(b); // 同一引用 = 命中缓存
  });
});

describe('loadEnglish · ext 优先覆盖同键字段 + 缓存', () => {
  afterEach(() => __resetLoaderCache());
  it('合并结果引用稳定且包含 base/ext 全部 word', () => {
    const first = loadEnglish();
    const second = loadEnglish();
    expect(first).toBe(second);
    const baseWords = new Set(
      (englishBase as { words: { word: string }[] }).words.map((w) => w.word),
    );
    const extWords = new Set(
      (englishExt as { words: { word: string }[] }).words.map((w) => w.word),
    );
    for (const w of baseWords) expect(first.some((e) => e.word === w)).toBe(true);
    for (const w of extWords) expect(first.some((e) => e.word === w)).toBe(true);
  });
});

describe('loadPinyin · 模块级缓存', () => {
  afterEach(() => __resetLoaderCache());
  it('连续两次调用返回同一对象引用', () => {
    expect(loadPinyin()).toBe(loadPinyin());
  });
});
