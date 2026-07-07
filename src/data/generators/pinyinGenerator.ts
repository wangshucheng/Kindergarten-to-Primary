/**
 * pinyinGenerator —— 拼音题生成器。
 * 从合并后的全量拼音库（loadPinyin）的 syllables 中按 level 抽例字，
 * 产出 音节-声母-韵母-例字 题。
 */
import type { GenOpts, Syllable } from '../types';
import { loadPinyin } from '../loader';
import { createRng } from '../../utils/rng';
import { shuffle } from '../../utils/shuffle';

export interface PinyinQuestion {
  pinyin: string;
  initial?: string;
  final?: string;
  char?: string;
  emoji?: string;
  meaning?: string;
  knowledgePoint: string;
}

export function genPinyin(opts: GenOpts): PinyinQuestion[] {
  const rng = createRng(opts.seed ?? Date.now());
  const data = loadPinyin();
  // 仅取带例字的音节作为题面素材
  let source = data.syllables.filter((s) => !!s.char);
  const levelPool = source.filter((s) => s.level === opts.level);
  if (levelPool.length >= opts.count) source = levelPool;
  const n = Math.max(0, Math.min(opts.count, source.length));
  return shuffle(source, rng)
    .slice(0, n)
    .map((s: Syllable) => ({
      pinyin: s.pinyin,
      initial: s.initial,
      final: s.final,
      char: s.char,
      emoji: s.emoji,
      meaning: s.meaning,
      knowledgePoint: `pinyin:${s.pinyin}`,
    }));
}
