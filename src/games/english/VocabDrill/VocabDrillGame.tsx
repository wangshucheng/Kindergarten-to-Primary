import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { Button } from '../../../components/Button';
import { useScore } from '../../../state/ScoreContext';
import { useTTS } from '../../../sound/useTTS';
import { computeStars } from '../../../utils/gameLoop';
import {
  makeListenQuestion,
  makeZhToEnQuestion,
  makePickQuestion,
  emojiFor,
  type VocabQuestion,
} from './vocabDrillLogic';

type Mode = 'listen' | 'zh2en' | 'pick';

const TOTAL_QUESTIONS = 10;
const ADVANCE_DELAY_MS = 850;

const MODES: { key: Mode; label: string }[] = [
  { key: 'listen', label: '🔊 听音选词' },
  { key: 'zh2en', label: '🔤 中译英' },
  { key: 'pick', label: '🖼️ 看图选词' },
];

function makeQuestion(mode: Mode, rng: () => number = Math.random): VocabQuestion {
  if (mode === 'listen') return makeListenQuestion(rng);
  if (mode === 'zh2en') return makeZhToEnQuestion(rng);
  return makePickQuestion(rng);
}

/**
 * 核心词汇 510 专项游戏：听音选词 / 中译英 / 看图选词 三模式。
 * 每种模式 10 题后结算；正确朗读英文并加分、连击奖励；错误标记可重试（无红色魔法色）。
 */
export function VocabDrillGame({ sound, tts: ttsManager, onComplete }: GameProps) {
  const tts = useTTS(ttsManager);
  const { addScore, bumpCombo, addMistake, mistakes, combo, score } = useScore();

  const [mode, setMode] = useState<Mode>('listen');
  const [q, setQ] = useState<VocabQuestion>(() => makeQuestion('listen'));
  const [idx, setIdx] = useState(1);
  const [wrongOpts, setWrongOpts] = useState<Set<number>>(new Set());
  const [locked, setLocked] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rngRef = useRef<() => number>(Math.random);

  useEffect(() => {
    tts.speakZh('核心词汇来啦！听一听、选一选～');
    return () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
      tts.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 进入新模式：重置题号与首题
  const enterMode = useCallback(
    (m: Mode) => {
      setMode(m);
      setIdx(1);
      setQ(makeQuestion(m, rngRef.current));
      setWrongOpts(new Set());
      setLocked(false);
    },
    [],
  );

  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes, durationMs });
    onComplete({ score, passed: true, stars, durationMs });
  }, [mistakes, score, onComplete]);

  const nextQuestion = useCallback(() => {
    if (idx >= TOTAL_QUESTIONS) {
      finish();
      return;
    }
    setIdx((i) => i + 1);
    setQ(makeQuestion(mode, rngRef.current));
    setWrongOpts(new Set());
    setLocked(false);
  }, [idx, mode, finish]);

  const handleSelect = useCallback(
    (opt: string, optIndex: number) => {
      if (locked) return;
      if (opt === q.options[q.answer]) {
        sound.play('correct');
        tts.speakEn(q.word.en);
        addScore(10 + Math.min(combo, 5) * 2);
        bumpCombo();
        setLocked(true);
        lockTimer.current = setTimeout(() => nextQuestion(), ADVANCE_DELAY_MS);
      } else {
        sound.play('wrong');
        addMistake();
        setWrongOpts((prev) => {
          const next = new Set(prev);
          next.add(optIndex);
          return next;
        });
      }
    },
    [locked, q, sound, tts, addScore, bumpCombo, addMistake, combo, nextQuestion],
  );

  // 听音模式：自动朗读英文
  const promptText =
    mode === 'listen'
      ? '🔊 听一听，选一选'
      : mode === 'zh2en'
        ? q.word.zh
        : `${emojiFor(q.word)} 看图选词`;

  useEffect(() => {
    if (mode === 'listen') {
      const id = window.setTimeout(() => tts.speakEn(q.word.en), 250);
      return () => window.clearTimeout(id);
    }
    if (mode === 'pick') {
      const id = window.setTimeout(() => tts.speakEn(q.word.en), 250);
      return () => window.clearTimeout(id);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, mode]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      {/* 模式菜单 */}
      <div className="inline-flex rounded-3xl bg-white/60 p-1 shadow-soft flex-wrap justify-center gap-1">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => enterMode(m.key)}
            className={[
              'px-3 py-2 rounded-2xl font-bold transition-all active:scale-95 text-sm',
              mode === m.key ? 'bg-lemon text-ink shadow-press' : 'text-inkSoft',
            ].join(' ')}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex w-full items-center justify-between text-ink font-bold">
        <span>
          第 {idx} / {TOTAL_QUESTIONS} 题
        </span>
        <span>⭐ {score}</span>
      </div>

      {/* 题干 */}
      <div className="w-full rounded-4xl bg-cream shadow-soft p-6 flex flex-col items-center gap-3 min-h-[120px] justify-center">
        {mode === 'pick' ? (
          <button
            onClick={() => tts.speakEn(q.word.en)}
            className="text-6xl"
            aria-label="听一听"
          >
            {emojiFor(q.word)}
          </button>
        ) : (
          <button
            onClick={() => (mode === 'listen' ? tts.speakEn(q.word.en) : tts.speakZh(q.word.zh))}
            className="text-3xl font-bold text-ink font-round tracking-wide text-center"
            aria-label="朗读题干"
          >
            {promptText}
          </button>
        )}
        {mode === 'listen' && (
          <Button variant="ghost" size="sm" onClick={() => tts.speakEn(q.word.en)}>
            🔊 再听一次
          </Button>
        )}
      </div>

      {/* 选项 */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {q.options.map((opt, i) => {
          const isWrong = wrongOpts.has(i);
          const base = 'w-full py-5 rounded-3xl font-bold text-xl text-ink shadow-press';
          const cls = isWrong
            ? 'bg-white/50 opacity-50 animate-shake'
            : 'bg-mint active:scale-95 transition-transform';
          return (
            <button
              key={opt}
              disabled={locked || isWrong}
              onClick={() => handleSelect(opt, i)}
              className={[base, cls].join(' ')}
              style={{ touchAction: 'manipulation' }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {wrongOpts.size > 0 && (
        <p className="text-inkSoft text-sm">再想想，选对就走啦～</p>
      )}
    </div>
  );
}

export default VocabDrillGame;
