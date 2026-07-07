import pinyinData from '../../../data/pinyin.json';
import { createRng, pick, type Rng } from '../../../utils/rng';
import { shuffle } from '../../../utils/shuffle';

export interface Syllable {
  initial: string;
  final: string;
  pinyin: string;
  tone: number;
  char: string;
  emoji: string;
  meaning: string;
}

export function getSyllables(): Syllable[] {
  return (pinyinData as { syllables: Syllable[] }).syllables;
}

export interface MatchRound {
  target: Syllable;
  initialOptions: string[];
  finalOptions: string[];
}

export interface VariantRound {
  target: Syllable;
  options: string[];
}

/** 声母×韵母拼读：每轮给出一个音节，玩家从选项中选对声母与韵母 */
export function buildMatchRounds(
  syllables: Syllable[],
  count: number,
  seed = Date.now(),
): MatchRound[] {
  const rng: Rng = createRng(seed);
  const rounds: MatchRound[] = [];
  for (let i = 0; i < count; i++) {
    const target = pick(syllables, rng);
    const otherInitials = [
      ...new Set(
        syllables
          .filter((s) => s.initial !== target.initial)
          .map((s) => s.initial),
      ),
    ];
    const otherFinals = [
      ...new Set(
        syllables
          .filter((s) => s.final !== target.final)
          .map((s) => s.final),
      ),
    ];
    const initialOptions = shuffle(
      [target.initial, ...shuffle(otherInitials, rng).slice(0, 3)],
      rng,
    );
    const finalOptions = shuffle(
      [target.final, ...shuffle(otherFinals, rng).slice(0, 3)],
      rng,
    );
    rounds.push({ target, initialOptions, finalOptions });
  }
  return rounds;
}

/** 拼读变体：给出汉字+释义，玩家选出正确拼音（含声调） */
export function buildVariantRounds(
  syllables: Syllable[],
  count: number,
  seed = Date.now(),
): VariantRound[] {
  const rng: Rng = createRng(seed);
  const rounds: VariantRound[] = [];
  for (let i = 0; i < count; i++) {
    const target = pick(syllables, rng);
    const others = [
      ...new Set(
        syllables
          .filter((s) => s.pinyin !== target.pinyin)
          .map((s) => s.pinyin),
      ),
    ];
    const options = shuffle([target.pinyin, ...shuffle(others, rng).slice(0, 3)], rng);
    rounds.push({ target, options });
  }
  return rounds;
}
