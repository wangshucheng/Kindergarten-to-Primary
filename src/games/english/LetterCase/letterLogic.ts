import { VOCAB } from '../../../data/vocabData';
import { createRng, type Rng } from '../../../utils/rng';
import { shuffle } from '../../../utils/shuffle';

export interface LetterPair {
  upper: string;
  lower: string;
}
export interface LetterItem {
  id: number;
  char: string;
}
export interface LetterRound {
  upper: LetterItem[];
  lower: LetterItem[];
}

/**
 * 大小写练习的「词库」：从核心词汇 VOCAB 取单词，大小写互为同一词。
 * 用单词（而非孤立字母）做大小写配对练习，贴合「核心词汇 510」知识网。
 */
export function getLetters(): LetterPair[] {
  return VOCAB.map((w) => ({ upper: w.en.toUpperCase(), lower: w.en.toLowerCase() }));
}

/** 抽取 count 个 VOCAB 单词，生成大写/小写两列（按 id 配对，均来自同一词） */
export function buildLetterRound(count: number, seed = Date.now()): LetterRound {
  const rng: Rng = createRng(seed);
  const chosen = shuffle(VOCAB, rng).slice(0, Math.max(0, Math.min(count, VOCAB.length)));
  const upper = shuffle(
    chosen.map((w, i) => ({ id: i, char: w.en.toUpperCase() })),
    rng,
  );
  const lower = shuffle(
    chosen.map((w, i) => ({ id: i, char: w.en.toLowerCase() })),
    rng,
  );
  return { upper, lower };
}
