import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { shuffle } from '../../../utils/shuffle';
import hanziData from '../../../data/hanzi.json';

interface Card {
  char: string;
  pinyin: string;
  emoji: string;
  meaning: string;
}
interface Pair {
  id: number;
  char: string;
  pinyin: string;
  emoji: string;
}

const cards = (hanziData as { cards: Card[] }).cards;
const COUNT = 6;

function buildPairs(count: number): { left: Pair[]; right: Pair[] } {
  const chosen = shuffle(cards).slice(0, count);
  const left = shuffle(
    chosen.map((c, i) => ({ id: i, char: c.char, pinyin: c.pinyin, emoji: c.emoji })),
  );
  const right = shuffle(
    chosen.map((c, i) => ({ id: i, char: c.char, pinyin: c.pinyin, emoji: c.emoji })),
  );
  return { left, right };
}

/**
 * 连线匹配（带拼音）：点击左边的字，再点击右边对应的拼音即可连线。
 */
export function ConnectMatchGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, mistakes } = useScore();
  const { left, right } = useMemo(() => buildPairs(COUNT), []);
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);

  useEffect(() => {
    tts.speak('把字和拼音连起来吧！');
  }, []);

  const finish = (): void => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes, durationMs });
    onComplete({ score: 0, passed: true, stars, durationMs });
  };

  const handleLeft = (p: Pair): void => {
    if (ended || matched.has(p.id)) return;
    sound.play('click');
    tts.speak(p.char);
    setSelected(p.id);
  };

  const handleRight = (p: Pair): void => {
    if (ended) return;
    if (selected === null) return;
    sound.play('click');
    if (selected === p.id) {
      const nm = new Set(matched);
      nm.add(p.id);
      setMatched(nm);
      setSelected(null);
      addScore(10);
      bumpCombo();
      sound.play('correct');
      tts.speak(p.char);
      if (nm.size === COUNT) finish();
    } else {
      addMistake();
      resetCombo();
      sound.play('wrong');
      setSelected(null);
    }
  };

  const isSel = (id: number) => selected === id;
  const isMat = (id: number) => matched.has(id);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center text-ink font-bold">把字和拼音连起来吧！</div>
      <div className="text-inkSoft text-sm">已连 {matched.size} / {COUNT}</div>

      <div className="w-full grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          {left.map((p) => (
            <button
              key={`l-${p.id}`}
              onClick={() => handleLeft(p)}
              disabled={isMat(p.id)}
              className={[
                'h-14 rounded-3xl font-extrabold text-2xl text-ink transition-all active:scale-95',
                isMat(p.id) ? 'opacity-30 bg-white' : isSel(p.id) ? 'bg-lemon ring-4 ring-white shadow-glow' : 'bg-white shadow-soft',
              ].join(' ')}
              style={{ touchAction: 'manipulation' }}
            >
              {p.char}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {right.map((p) => (
            <button
              key={`r-${p.id}`}
              onClick={() => handleRight(p)}
              disabled={isMat(p.id)}
              className={[
                'h-14 rounded-3xl font-extrabold text-xl text-ink transition-all active:scale-95',
                isMat(p.id) ? 'opacity-30 bg-white' : 'bg-white shadow-soft',
              ].join(' ')}
              style={{ touchAction: 'manipulation' }}
            >
              {p.pinyin}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ConnectMatchGame;
