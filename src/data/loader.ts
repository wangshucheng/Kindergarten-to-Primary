/**
 * DataLoader —— 合并现状子集（hanzi.json / english.json / pinyin.json / math.json）
 * 与全量扩充（hanzi-ext.json / english-ext.json / pinyin-full.json / math-content.json）。
 *
 * 合并策略：
 * - 主键去重（汉字 char、英语 word、拼音 pinyin、数学顶层键浅合并）；
 * - ext 字段优先、base 作 fallback；
 * - 结果模块级缓存，避免重复解析 JSON。
 *
 * 注意：本文件只做数据聚合，不依赖任何浏览器 API，可在 node 环境单测。
 */
import type { HanziEntry, EnglishWord, Syllable, PinyinData, MathContent } from './types';

import hanziBase from './hanzi.json';
import hanziExt from './hanzi-ext.json';
import englishBase from './english.json';
import englishExt from './english-ext.json';
import pinyinBase from './pinyin.json';
import pinyinExt from './pinyin-full.json';
import mathBase from './math.json';
import mathContent from './math-content.json';

const cache: {
  hanzi?: HanziEntry[];
  english?: EnglishWord[];
  pinyin?: PinyinData;
  math?: MathContent;
} = {};

function uniqueStrings(arr: readonly string[]): string[] {
  return Array.from(new Set(arr));
}

/** 合并汉字：base.hanzi.json.cards ∪ ext.hanzi-ext.json.chars（by char，ext 优先） */
export function loadHanzi(): HanziEntry[] {
  if (cache.hanzi) return cache.hanzi;
  const baseCards = (hanziBase as unknown as { cards?: HanziEntry[] }).cards ?? [];
  const extChars = (hanziExt as unknown as { chars?: HanziEntry[] }).chars ?? [];
  const byChar = new Map<string, HanziEntry>();
  for (const e of baseCards) byChar.set(e.char, e);
  for (const e of extChars) byChar.set(e.char, { ...byChar.get(e.char), ...e });
  cache.hanzi = Array.from(byChar.values()) as unknown as HanziEntry[];
  return cache.hanzi;
}

/** 合并英语：base.english.json.words ∪ ext.english-ext.json.words（by word，ext 优先） */
export function loadEnglish(): EnglishWord[] {
  if (cache.english) return cache.english;
  const baseWords = (englishBase as unknown as { words?: EnglishWord[] }).words ?? [];
  const extWords = (englishExt as unknown as { words?: EnglishWord[] }).words ?? [];
  const byWord = new Map<string, EnglishWord>();
  for (const e of baseWords) byWord.set(e.word, e);
  for (const e of extWords) byWord.set(e.word, { ...byWord.get(e.word), ...e });
  cache.english = Array.from(byWord.values()) as unknown as EnglishWord[];
  return cache.english;
}

/** 合并拼音：initials/finals/wholeSyllables 取并集，syllables by pinyin（ext 优先） */
export function loadPinyin(): PinyinData {
  if (cache.pinyin) return cache.pinyin;
  const base = pinyinBase as unknown as {
    initials?: string[];
    finals?: string[];
    syllables?: Syllable[];
    wholeSyllables?: string[];
  };
  const ext = pinyinExt as unknown as PinyinData;

  const initials = uniqueStrings([...(base.initials ?? []), ...ext.initials]);
  const finals = uniqueStrings([...(base.finals ?? []), ...ext.finals]);
  const wholeSyllables = uniqueStrings([...(base.wholeSyllables ?? []), ...ext.wholeSyllables]);
  const byPinyin = new Map<string, Syllable>();
  for (const s of base.syllables ?? []) byPinyin.set(s.pinyin, s);
  for (const s of ext.syllables) byPinyin.set(s.pinyin, { ...byPinyin.get(s.pinyin), ...s });

  cache.pinyin = {
    initials,
    finals,
    wholeSyllables,
    syllables: Array.from(byPinyin.values()),
  };
  return cache.pinyin;
}

/** 合并数学内容：math.json 与 math-content.json 顶层浅合并（ext 覆盖同键） */
export function loadMathContent(): MathContent {
  if (cache.math) return cache.math;
  const base = mathBase as unknown as MathContent;
  const ext = mathContent as unknown as MathContent;
  cache.math = { ...base, ...ext } as MathContent;
  return cache.math;
}

/** 仅供测试重置模块级缓存 */
export function __resetLoaderCache(): void {
  cache.hanzi = undefined;
  cache.english = undefined;
  cache.pinyin = undefined;
  cache.math = undefined;
}
