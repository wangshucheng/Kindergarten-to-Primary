import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { shuffle } from '../../../utils/shuffle';
import { pick, createRng, type Rng } from '../../../utils/rng';
import hanziData from '../../../data/hanzi.json';

interface Card {
  char: string;
  pinyin: string;
  emoji: string;
  meaning: string;
}
interface Round {
  target: Card;
  options: string[];
}

const cards = (hanziData as { cards: Card[] }).cards;
const ROUND_COUNT = 10;

function buildRounds(count: number, seed = Date.now()): Round[] {
  const rng: Rng = createRng(seed);
  const rounds: Round[] = [];
  for (let i = 0; i < count; i++) {
    const target = pick(cards, rng);
    const others = cards.filter((c) => c.char !== target.char).map((c) => c.char);
    const options = shuffle([target.char, ...shuffle(others, rng).slice(0, 3)], rng);
    rounds.push({ target, options });
  }
  return rounds;
}

/**
 * 趣味识字（选字填空）：看图和意思，选出正确的汉字。
 */
export function MoreHanziGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, mistakes } = useScore();
  const rounds = useMemo<Round[]>(() => buildRounds(ROUND_COUNT), []);
  const [index, setIndex] = useState(0);
  const [wrongOpt, setWrongOpt] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);
  const firstRef = useRef<boolean>(true);

  useEffect(() => {
    tts.speak('看图，选出正确的字！');
  }, []);

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      window.setTimeout(() => tts.speak(round.target.char), 1300);
    } else {
      tts.speak(round.target.char);
    }
  }, [index]);

  const round = rounds[index];

  const finish = (): void => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes, durationMs });
    onComplete({ score: 0, passed: true, stars, durationMs });
  };

  const handle = (opt: string): void => {
    if (ended) return;
    sound.play('click');
    if (opt === round.target.char) {
      addScore(10);
      bumpCombo();
      sound.play('correct');
      tts.speak(opt);
      setWrongOpt(null);
      if (index < rounds.length - 1) setIndex(index + 1);
      else finish();
    } else {
      addMistake();
      resetCombo();
      sound.play('wrong');
      setWrongOpt(opt);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center text-ink font-bold">
        第 {index + 1} / {rounds.length} 关 · 选出正确的字
      </div>

      <div className="flex flex-col items-center gap-3 bg-white rounded-4xl shadow-soft px-8 py-4">
        <div className="text-7xl">{round.target.emoji}</div>
        <button
          type="button"
          onClick={() => tts.speak(round.target.char)}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-white shadow-press text-lg font-bold text-ink active:scale-95"
          style={{ touchAction: 'manipulation' }}
          aria-label="听一听"
        >
          🔊 听一听
        </button>
      </div>

      <div className="w-full grid grid-cols-2 gap-3">
        {round.options.map((opt) => (
          <button
            key={opt}
            onClick={() => handle(opt)}
            className={[
              'h-16 rounded-3xl font-extrabold text-3xl text-ink transition-all active:scale-95',
              wrongOpt === opt ? 'bg-peach/60 ring-4 ring-red-300 animate-shake' : 'bg-white shadow-soft',
            ].join(' ')}
            style={{ touchAction: 'manipulation' }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default MoreHanziGame;
