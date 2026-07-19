import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { Button } from '../../../components/Button';
import { useScore } from '../../../state/ScoreContext';
import { useTTS } from '../../../sound/useTTS';
import { computeStars } from '../../../utils/gameLoop';
import { makeSpeedQuestion, speedPromptText, type SpeedQuestion } from './speedDrillLogic';

const TOTAL_QUESTIONS = 10;
const ADVANCE_DELAY_MS = 1200;

/**
 * 速算擂台（SpeedDrill）：
 * - 随机出题 + 4 选项，选对朗读并加分、连击；
 * - 答对后展示该乘数的「速算小技巧」点拨，延时约 1200ms 再进下一题；
 * - 10 题后结算。严格关联 content/multiplication-table.md 第二节。
 */
export function SpeedDrillGame({ sound, tts: ttsManager, onComplete }: GameProps) {
  const tts = useTTS(ttsManager);
  const { addScore, bumpCombo, addMistake, mistakes, combo, score } = useScore();

  const [q, setQ] = useState<SpeedQuestion>(() => makeSpeedQuestion());
  const [idx, setIdx] = useState(1);
  const [wrongOpts, setWrongOpts] = useState<Set<number>>(new Set());
  const [locked, setLocked] = useState(false);
  const [showTrick, setShowTrick] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    tts.speakZh('速算擂台开始啦，选对还能学速算小技巧～');
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
    setQ(makeSpeedQuestion());
    setWrongOpts(new Set());
    setLocked(false);
    setShowTrick(false);
  }, [idx, finish]);

  const handleSelect = useCallback(
    (opt: number) => {
      if (locked) return;
      if (opt === q.answer) {
        sound.play('correct');
        tts.speakZh(`${q.a} 乘 ${q.b} 等于 ${q.answer}`);
        // 基础 10 分 + 连击奖励（连击封顶 5 段，每段 +2 分）
        addScore(10 + Math.min(combo, 5) * 2);
        bumpCombo();
        setLocked(true);
        setShowTrick(true);
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
        <View className="text-inkSoft text-sm">速算一下</View>
        <View
          onClick={() => tts.speakZh(speedPromptText(q.a, q.b))}
          className="text-5xl font-bold text-ink font-round tracking-wide"
          aria-label="朗读题目"
        >
          {q.a} × {q.b} = ?
        </View>
        <Button variant="ghost" size="sm" onClick={() => tts.speakZh(speedPromptText(q.a, q.b))}>
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
              {opt}
            </View>
          );
        })}
      </View>

      {showTrick && (
        <View className="w-full rounded-4xl bg-cream shadow-soft p-5 flex flex-col items-center gap-1 text-center">
          <View className="text-inkSoft text-xs">✨ 速算小技巧（×{q.focusMultiplier}）</View>
          <View className="text-ink font-bold text-lg">{q.trick.trick}</View>
          <View className="text-inkSoft text-base">例 {q.trick.example}</View>
        </View>
      )}

      {wrongOpts.size > 0 && (
        <Text className="text-inkSoft text-sm">再想想，选对就走啦～</Text>
      )}
    </View>
  );
}

export default SpeedDrillGame;
