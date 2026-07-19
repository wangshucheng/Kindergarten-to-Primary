/**
 * categoryLearnLogic —— 分类学习卡片的纯逻辑层。
 *
 * 从 vocabData.ts 的 VOCAB_BY_THEME 提取分类与单词列表，
 * 供 CategoryLearnGame 组件渲染。
 */
import { VOCAB_BY_THEME, THEME_EMOJI, type WordEntry } from '../../../data/vocabData';
import { getWordImage, getWordEmoji } from '../../../data/wordImages';

/** 分类条目（用于渲染分类网格） */
export interface CategoryItem {
  /** 主题名（如 "动物"） */
  theme: string;
  /** 主题代表 emoji */
  emoji: string;
  /** 该分类下的单词数 */
  count: number;
}

/** 单词卡片展示数据 */
export interface WordCard {
  en: string;
  zh: string;
  pos: string;
  example?: string;
  theme: string;
  /** 图片 URL（若已生成），否则为 null */
  image: string | null;
  /** emoji（用于无图片时回退） */
  emoji: string;
}

/**
 * 获取所有分类列表（按主题排序）。
 */
export function getCategories(): CategoryItem[] {
  return Object.keys(VOCAB_BY_THEME)
    .sort()
    .map((theme) => ({
      theme,
      emoji: THEME_EMOJI[theme] ?? '📘',
      count: VOCAB_BY_THEME[theme].length,
    }));
}

/**
 * 获取指定分类下的单词卡片列表。
 * @param theme 主题名（如 "动物"）
 */
export function getWordsByCategory(theme: string): WordCard[] {
  const words = VOCAB_BY_THEME[theme] ?? [];
  return words.map((w: WordEntry) => ({
    en: w.en,
    zh: w.zh,
    pos: w.pos,
    example: w.example,
    theme: w.theme,
    image: getWordImage(w.en),
    emoji: getWordEmoji(w.en, w.theme),
  }));
}

/**
 * 获取所有分类名数组。
 */
export function getAllThemes(): string[] {
  return Object.keys(VOCAB_BY_THEME).sort();
}
