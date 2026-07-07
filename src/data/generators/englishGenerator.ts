/**
 * englishGenerator —— 英语词生成器。
 * 从合并后的全量英语库（loadEnglish）按 level 抽词，产出 词-图-义 题。
 */
import type { EnglishWord, GenOpts } from '../types';
import { loadEnglish } from '../loader';
import { createRng } from '../../utils/rng';
import { shuffle } from '../../utils/shuffle';

export interface EnglishQuestion {
  word: string;
  emoji: string;
  meaning: string;
  category?: string;
  knowledgePoint: string;
}

export function genEnglish(opts: GenOpts): EnglishQuestion[] {
  const rng = createRng(opts.seed ?? Date.now());
  const pool = loadEnglish();
  const levelPool = pool.filter((e) => e.level === opts.level);
  const source = levelPool.length >= opts.count ? levelPool : pool;
  const n = Math.max(0, Math.min(opts.count, source.length));
  return shuffle(source, rng)
    .slice(0, n)
    .map((e: EnglishWord) => ({
      word: e.word,
      emoji: e.emoji,
      meaning: e.meaning,
      category: e.category,
      knowledgePoint: `english:${e.word}`,
    }));
}
