import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { Button } from '../../../components/Button';
import { useScore } from '../../../state/ScoreContext';
import { useTTS } from '../../../sound/useTTS';
import { computeStars } from '../../../utils/gameLoop';
import { makeWordProblem, type WordProblemQuestion } from './wordProblemLogic';

const TOTAL_QUESTIONS = 10;
const ADVANCE_DELAY_MS = 1000;

/**
 * 应用题闯关（WordProblem）：
 * - 展示题干 + 大号算式，4 选 1 数字答案；
 * - 答对朗读「算式=答案单位」并展示正确算式/答案；
 * - 10 题后结算。关联 content/multiplication-table.md 第三节。
 */
export function WordProblemGame({ sound, tts: ttsManager, onComplete }: GameProps) {
  const tts = useTTS(ttsManager);
  const { addScore, bumpCombo, addMistake, mistakes, combo, score } = useScore();

  const [q, setQ] = useState<WordProblemQuestion>(() => makeWordProblem());
  const [idx, setIdx] = useState(1);
  const [wrongOpts, setWrongOpts] = useState<Set<number>>(new Set());
  const [locked, setLocked] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    tts.speakZh('应用题闯关来啦，读题算一算～');
    return () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
      tts.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setQ(makeWordProblem());
    setWrongOpts(new Set());
    setLocked(false);
  }, [idx, finish]);

  const handleSelect = useCallback(
    (opt: number) => {
      if (locked) return;
      if (opt === q.answer) {
        sound.play('correct');
        tts.speakZh(`${q.equation}=${q.answer}${q.unit}`);
        addScore(10 + Math.min(combo, 5) * 2);
        bumpCombo();
        setLocked(true);
        lockTimer.current = setTimeout(() => {
          void nextQuestion();
        }, ADVANCE_DELAY_MS);
      } else {
        sound.play('wrong');
        addMistake();
        setWrongOpts((prev) => {
          const next = new Set(prev);
          next.add(opt);
          return next;
        });
      }
    },
    [locked, q, sound, tts, addScore, bumpCombo, addMistake, combo, nextQuestion],
  );

  return (
    <View className="flex flex-col items-center gap-4 w-full max-w-md">
      <View className="flex w-full items-center justify-between text-ink font-bold">
        <Text>
          第 {idx} / {TOTAL_QUESTIONS} 题
        </Text>
        <Text>⭐ {score}</Text>
      </View>

      <View className="w-full rounded-4xl bg-cream shadow-soft p-6 flex flex-col items-center gap-3">
        <Text className="text-ink text-base leading-relaxed text-center px-2">{q.stem}</Text>
        <View className="flex items-center gap-3">
          <Text className="text-4xl font-bold text-ink font-round tracking-wide">{q.equation}</Text>
          <Text className="text-4xl font-bold text-inkSoft">= ?</Text>
        </View>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => tts.speakZh(q.stem)}
        >
          🔊 听题目
        </Button>
      </View>

      <View className="grid grid-cols-2 gap-3 w-full">
        {q.options.map((opt) => {
          const isWrong = wrongOpts.has(opt);
          const base = 'w-full py-5 rounded-3xl font-bold text-2xl text-ink shadow-press flex items-center justify-center text-center';
          const cls = isWrong
            ? 'bg-white/50 opacity-50 animate-shake'
            : 'bg-mint active:scale-95 transition-transform';
          return (
            <View
              key={opt}
              disabled={locked || isWrong}
              onClick={() => handleSelect(opt)}
              className={[base, cls].join(' ')}
            >
              {opt} {q.unit}
            </View>
          );
        })}
      </View>

      {locked && (
        <View className="w-full rounded-4xl bg-cream shadow-soft p-4 text-center">
          <View className="text-ink font-bold text-lg">
            {q.equation} = {q.answer} {q.unit}
          </View>
        </View>
      )}

      {wrongOpts.size > 0 && (
        <Text className="text-inkSoft text-sm">再想想，选对就走啦～</Text>
      )}
    </View>
  );
}

export default WordProblemGame;
