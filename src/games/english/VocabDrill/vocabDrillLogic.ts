/**
 * VocabDrill 纯逻辑层（与 React 解耦，便于单测 / 注入 rng 复现）。
 *
 * 三种题型：
 *  - makeListenQuestion：听音选词。朗读英文，4 个中文选项。
 *  - makeZhToEnQuestion ：中译英。给中文，4 个英文选项。
 *  - makePickQuestion   ：看图选词。给 emoji「图」+ 朗读英文，4 个英文选项。
 *
 * 所有题型返回 { word, options, answer }：
 *  - options 长度恒为 4、元素唯一、且包含正确答案（answer 为正确项索引）。
 *  - rng 默认 Math.random，可注入 createRng(seed) 以复现。
 */
import { createRng, type Rng } from '../../../utils/rng';
import { shuffle } from '../../../utils/shuffle';
import { VOCAB, type WordEntry } from '../../../data/vocabData';
import { getWordEmoji } from '../../../data/wordImages';

export interface VocabQuestion {
  /** 本题对应的词条（含 en/zh/pos/example/theme） */
  word: WordEntry;
  /** 4 个唯一选项 */
  options: string[];
  /** 正确选项在 options 中的索引 */
  answer: number;
}

const OPTION_COUNT = 4;

/** 抽取 count 个与 correct 不同的干扰项（字符串池），保证唯一且不含 correct */
function pickDistractors(pool: string[], correct: string, count: number, rng: Rng): string[] {
  const used = new Set<string>([correct]);
  const result: string[] = [];
  // 优先随机取样
  const shuffled = shuffle(pool, rng);
  for (const cand of shuffled) {
    if (result.length >= count) break;
    if (used.has(cand)) continue;
    used.add(cand);
    result.push(cand);
  }
  return result;
}

/** 组装 4 选项（含正确答案）并打乱，返回 { options, answer } */
function buildOptions(correct: string, pool: string[], rng: Rng): { options: string[]; answer: number } {
  const distractors = pickDistractors(pool, correct, OPTION_COUNT - 1, rng);
  const options = shuffle([correct, ...distractors], rng);
  return { options, answer: options.indexOf(correct) };
}

/** 听音选词：朗读英文，4 个中文释义选项 */
export function makeListenQuestion(rng: Rng = Math.random): VocabQuestion {
  const word = VOCAB[Math.floor(rng() * VOCAB.length)];
  const pool = VOCAB.filter((w) => w.zh !== word.zh).map((w) => w.zh);
  const { options, answer } = buildOptions(word.zh, pool, rng);
  return { word, options, answer };
}

/** 中译英：给中文释义，4 个英文选项 */
export function makeZhToEnQuestion(rng: Rng = Math.random): VocabQuestion {
  const word = VOCAB[Math.floor(rng() * VOCAB.length)];
  const pool = VOCAB.filter((w) => w.en !== word.en).map((w) => w.en);
  const { options, answer } = buildOptions(word.en, pool, rng);
  return { word, options, answer };
}

/** 看图选词：给 emoji「图」+ 朗读英文，4 个英文选项（选对应英文词） */
export function makePickQuestion(rng: Rng = Math.random): VocabQuestion {
  const word = VOCAB[Math.floor(rng() * VOCAB.length)];
  const pool = VOCAB.filter((w) => w.en !== word.en).map((w) => w.en);
  const { options, answer } = buildOptions(word.en, pool, rng);
  return { word, options, answer };
}

/** 取词条的「图」（优先单词专属 emoji，回退主题代表 emoji） */
export function emojiFor(word: WordEntry): string {
  return getWordEmoji(word.en, word.theme);
}
