import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import eng from '../../../data/english.json';

interface Sentence {
  template: string;
  options: string[];
  answer: number;
}

const sentences = (eng as { sentences: Sentence[] }).sentences;

/**
 * 简单句填空：读句子，选出横线上正确的单词。
 */
export function SentenceFillGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, mistakes } = useScore();
  const [index, setIndex] = useState(0);
  const [wrongOpt, setWrongOpt] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);

  useEffect(() => {
    tts.speak('读句子，选词填空！');
  }, []);

  const round = sentences[index];

  const finish = (): void => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes, durationMs });
    onComplete({ score: 0, passed: true, stars, durationMs });
  };

  const handle = (optIdx: number): void => {
    if (ended) return;
    sound.play('click');
    if (optIdx === round.answer) {
      addScore(10);
      bumpCombo();
      sound.play('correct');
      const spoken = round.template.replace('{blank}', round.options[round.answer]);
      tts.speak(spoken, {
        lang: 'en-US',
        onEnd: () => {
          setWrongOpt(null);
          if (index < sentences.length - 1) setIndex(index + 1);
          else finish();
        },
      });
    } else {
      addMistake();
      resetCombo();
      sound.play('wrong');
      setWrongOpt(optIdx);
    }
  };

  const sentenceText = round.template.replace('{blank}', '＿＿＿');

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center text-ink font-bold">
        第 {index + 1} / {sentences.length} 关 · 选词填空
      </div>

      <div className="w-full bg-white rounded-4xl shadow-soft px-6 py-6 text-center">
        <p className="text-2xl font-extrabold text-ink leading-relaxed">{sentenceText}</p>
      </div>

      <div className="w-full grid grid-cols-1 gap-3">
        {round.options.map((opt, i) => (
          <button
            key={opt}
            onClick={() => handle(i)}
            className={[
              'h-14 rounded-3xl font-extrabold text-xl text-ink transition-all active:scale-95',
              wrongOpt === i ? 'bg-peach/60 ring-4 ring-red-300 animate-shake' : 'bg-white shadow-soft',
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

export default SentenceFillGame;
