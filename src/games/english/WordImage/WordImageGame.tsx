import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { shuffle } from '../../../utils/shuffle';
import { VOCAB } from '../../../data/vocabData';
import { getWordEmoji } from '../../../data/wordImages';

interface Word {
  word: string;
  emoji: string;
  meaning: string;
}
interface WordItem {
  id: number;
  text: string;
  emoji: string;
}

const words: Word[] = VOCAB.map((v) => ({
  word: v.en,
  emoji: getWordEmoji(v.en, v.theme),
  meaning: v.zh,
}));
const PER_ROUND = 6;
const ROUNDS = 3;

function buildRound(): { left: WordItem[]; right: WordItem[] } {
  const chosen = shuffle(words).slice(0, PER_ROUND);
  const left = shuffle(
    chosen.map((w, i) => ({ id: i, text: w.word, emoji: w.emoji })),
  );
  const right = shuffle(
    chosen.map((w, i) => ({ id: i, text: w.emoji, emoji: w.emoji })),
  );
  return { left, right };
}

/**
 * 单词图文匹配：点击左侧单词，再点击右侧对应的图片。
 */
export function WordImageGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, mistakes } = useScore();
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState(buildRound);
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);

  useEffect(() => {
    tts.speak('点击单词，连到对应的图片！');
  }, []);

  const finish = (): void => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes, durationMs });
    onComplete({ score: 0, passed: true, stars, durationMs });
  };

  const handleLeft = (p: WordItem): void => {
    if (ended || matched.has(p.id)) return;
    sound.play('click');
    tts.speak(p.text, { lang: 'en-US' });
    setSelected(p.id);
  };

  const handleRight = (p: WordItem): void => {
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
      const word = round.left.find((l) => l.id === p.id)?.text ?? '';
      if (word) tts.speak(word, { lang: 'en-US' });
      if (nm.size === PER_ROUND) {
        if (roundIndex < ROUNDS - 1) {
          sound.play('levelup');
          setRoundIndex(roundIndex + 1);
          setRound(buildRound());
          setMatched(new Set());
          setSelected(null);
        } else {
          finish();
        }
      }
    } else {
      addMistake();
      resetCombo();
      sound.play('wrong');
      setSelected(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center text-ink font-bold">
        第 {roundIndex + 1} / {ROUNDS} 关 · 单词连图片
      </div>
      <div className="text-inkSoft text-sm">已连 {matched.size} / {PER_ROUND}</div>

      <div className="w-full grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          {round.left.map((p) => (
            <button
              key={`w-${p.id}`}
              onClick={() => handleLeft(p)}
              disabled={isMat(p.id)}
              className={[
                'h-14 rounded-3xl font-extrabold text-xl text-ink transition-all active:scale-95',
                isMat(p.id) ? 'opacity-30 bg-white' : isSel(p.id) ? 'bg-lemon ring-4 ring-white shadow-glow' : 'bg-white shadow-soft',
              ].join(' ')}
              style={{ touchAction: 'manipulation' }}
            >
              {p.text}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {round.right.map((p) => (
            <button
              key={`e-${p.id}`}
              onClick={() => handleRight(p)}
              disabled={isMat(p.id)}
              className={[
                'h-14 rounded-3xl text-3xl transition-all active:scale-95',
                isMat(p.id) ? 'opacity-30 bg-white' : 'bg-white shadow-soft',
              ].join(' ')}
              style={{ touchAction: 'manipulation' }}
            >
              {p.emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  function isMat(id: number): boolean {
    return matched.has(id);
  }
  function isSel(id: number): boolean {
    return selected === id;
  }
}

export default WordImageGame;
