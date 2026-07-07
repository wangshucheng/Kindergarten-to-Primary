import eng from '../../../data/english.json';
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

export function getLetters(): LetterPair[] {
  return (eng as { letters: LetterPair[] }).letters;
}

/** 抽取 count 个字母，生成大写/小写两列（按 id 配对） */
export function buildLetterRound(count: number, seed = Date.now()): LetterRound {
  const rng: Rng = createRng(seed);
  const chosen = shuffle(getLetters(), rng).slice(0, count);
  const upper = shuffle(
    chosen.map((l, i) => ({ id: i, char: l.upper })),
    rng,
  );
  const lower = shuffle(
    chosen.map((l, i) => ({ id: i, char: l.lower })),
    rng,
  );
  return { upper, lower };
}
