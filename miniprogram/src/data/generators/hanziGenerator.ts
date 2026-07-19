/**
 * hanziGenerator —— 汉字题生成器。
 * 从合并后的全量汉字库（loadHanzi）按 level/mode 抽题，产出配对/反义/量词题。
 */
import type { HanziEntry, GenOpts } from '../types';
import { loadHanzi } from '../loader';
import { createRng } from '../../utils/rng';
import { shuffle } from '../../utils/shuffle';

export interface HanziQuestion {
  kind: 'char-pinyin' | 'antonym' | 'measure';
  char: string;
  pinyin: string;
  emoji?: string;
  meaning?: string;
  pair?: { char: string; pinyin: string; emoji?: string };
  antonym?: string;
  measureWord?: string;
  knowledgePoint: string;
}

function toQuestion(entry: HanziEntry, mode?: string): HanziQuestion {
  const kp = `hanzi:${entry.char}`;
  if (mode === 'antonym') {
    return {
      kind: 'antonym',
      char: entry.char,
      pinyin: entry.pinyin,
      emoji: entry.emoji,
      meaning: entry.meaning,
      antonym: entry.antonym,
      knowledgePoint: kp,
    };
  }
  if (mode === 'measure') {
    return {
      kind: 'measure',
      char: entry.char,
      pinyin: entry.pinyin,
      emoji: entry.emoji,
      meaning: entry.meaning,
      measureWord: entry.measureWord,
      knowledgePoint: kp,
    };
  }
  // 默认 char-pinyin：字块 + 拼音块配对
  return {
    kind: 'char-pinyin',
    char: entry.char,
    pinyin: entry.pinyin,
    emoji: entry.emoji,
    meaning: entry.meaning,
    pair: { char: entry.char, pinyin: entry.pinyin, emoji: entry.emoji },
    knowledgePoint: kp,
  };
}

export function genHanzi(opts: GenOpts): HanziQuestion[] {
  const rng = createRng(opts.seed ?? Date.now());
  let pool = loadHanzi();

  if (opts.mode === 'antonym') {
    pool = pool.filter((e) => !!e.antonym);
  } else if (opts.mode === 'measure') {
    pool = pool.filter((e) => !!e.measureWord);
  }

  const levelPool = pool.filter((e) => e.level === opts.level);
  const source = levelPool.length >= opts.count ? levelPool : pool;
  const n = Math.max(0, Math.min(opts.count, source.length));
  return shuffle(source, rng)
    .slice(0, n)
    .map((e) => toQuestion(e, opts.mode));
}
