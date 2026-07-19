import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { Button } from '../../../components/Button';
import { useScore } from '../../../state/ScoreContext';
import { useTTS } from '../../../sound/useTTS';
import { computeStars } from '../../../utils/gameLoop';
import {
  buildTable,
  makeQuestion,
  promptText,
  rhymeText,
  type MultiplicationQuestion,
  type TableCell,
} from './multiplicationLogic';

type Mode = 'practice' | 'table';

const TOTAL_QUESTIONS = 10;
const ADVANCE_DELAY_MS = 900;

/**
 * 乘法口诀（1–9 乘法表）：
 * - 练习模式：随机出题 + 4 选项，选对朗读口诀并加分、10 题后结算；
 * - 口诀表模式：9×9 浏览/自测，点击朗读，可隐藏答案。
 * 两种模式通过顶部分段控制切换；口诀表不调用 onComplete，用 HUD 返回退出。
 */
export function MultiplicationGame({ sound, tts: ttsManager, onComplete }: GameProps) {
  const tts = useTTS(ttsManager);
  const { addScore, bumpCombo, addMistake, mistakes, combo, score } = useScore();
  const [mode, setMode] = useState<Mode>('practice');

  // ---------------- 练习模式状态 ----------------
  const [q, setQ] = useState<MultiplicationQuestion>(() => makeQuestion());
  const [idx, setIdx] = useState(1);
  const [wrongOpts, setWrongOpts] = useState<Set<number>>(new Set());
  const [locked, setLocked] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------- 口诀表状态 ----------------
  const [table] = useState<TableCell[][]>(() => buildTable());
  const [revealed, setRevealed] = useState<boolean>(true);
  const [activeCell, setActiveCell] = useState<{ a: number; b: number } | null>(null);

  useEffect(() => {
    tts.speakZh('乘法口诀来啦，点一点就能听～');
    return () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
      tts.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishPractice = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes, durationMs });
    onComplete({ score, passed: true, stars, durationMs });
  }, [mistakes, score, onComplete]);

  const nextQuestion = useCallback(() => {
    if (idx >= TOTAL_QUESTIONS) {
      finishPractice();
      return;
    }
    setIdx((i) => i + 1);
    setQ(makeQuestion());
    setWrongOpts(new Set());
    setLocked(false);
  }, [idx, finishPractice]);

  const handleSelect = useCallback(
    (opt: number) => {
      if (locked) return;
      if (opt === q.answer) {
        sound.play('correct');
        tts.speakZh(rhymeText(q.a, q.b));
        // 基础 10 分 + 连击奖励（连击封顶 5 段，每段 +2 分）
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

  // ---------------- 渲染：分段控制 ----------------
  const segmented = (
    <View className="inline-flex rounded-3xl bg-white/60 p-1 shadow-soft">
      <View
        onClick={() => setMode('practice')}
        className={[
          'px-4 py-2 rounded-2xl font-bold transition-all active:scale-95',
          mode === 'practice' ? 'bg-peach text-ink shadow-press' : 'text-inkSoft',
        ].join(' ')}
      >
        🎯 练习
      </View>
      <View
        onClick={() => setMode('table')}
        className={[
          'px-4 py-2 rounded-2xl font-bold transition-all active:scale-95',
          mode === 'table' ? 'bg-peach text-ink shadow-press' : 'text-inkSoft',
        ].join(' ')}
      >
        📖 口诀表
      </View>
    </View>
  );

  // ---------------- 渲染：练习模式 ----------------
  const practiceView = (
    <View className="flex flex-col items-center gap-4 w-full max-w-md">
      <View className="flex w-full items-center justify-between text-ink font-bold">
        <Text>
          第 {idx} / {TOTAL_QUESTIONS} 题
        </Text>
        <Text>⭐ {score}</Text>
      </View>

      <View className="w-full rounded-4xl bg-cream shadow-soft p-6 flex flex-col items-center gap-3">
        <View className="text-inkSoft text-sm">算一算</View>
        <View
          onClick={() => tts.speakZh(promptText(q.a, q.b))}
          className="text-5xl font-bold text-ink font-round tracking-wide"
          aria-label="朗读题目"
        >
          {q.a} × {q.b} = ?
        </View>
        <Button variant="ghost" size="sm" onClick={() => tts.speakZh(promptText(q.a, q.b))}>
          🔊 听题目
        </Button>
      </View>

      <View className="grid grid-cols-2 gap-3 w-full">
        {q.options.map((opt) => {
          const isWrong = wrongOpts.has(opt);
          const base = 'w-full py-5 rounded-3xl font-bold text-2xl text-ink shadow-press';
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

      {wrongOpts.size > 0 && (
        <Text className="text-inkSoft text-sm">再想想，选对就走啦～</Text>
      )}
    </View>
  );

  // ---------------- 渲染：口诀表模式 ----------------
  const tableView = (
    <View className="flex flex-col items-center gap-3 w-full max-w-md">
      <Button variant="lemon" size="sm" onClick={() => setRevealed((r) => !r)}>
        {revealed ? '🙈 隐藏答案' : '👀 显示答案'}
      </Button>
      <View className="rounded-4xl bg-cream shadow-soft p-3 overflow-x-auto w-full">
        <View className="grid grid-cols-9 gap-1 min-w-[320px]">
          {table.map((row) =>
            row.map((cell) => {
              const isActive = activeCell?.a === cell.a && activeCell?.b === cell.b;
              return (
                <View
                  key={`${cell.a}-${cell.b}`}
                  onClick={() => {
                    setActiveCell({ a: cell.a, b: cell.b });
                    tts.speakZh(rhymeText(cell.a, cell.b));
                  }}
                  className={[
                    'flex flex-col items-center justify-center rounded-2xl px-1 py-2 text-center transition-all active:scale-95 min-h-[52px]',
                    isActive ? 'bg-peach shadow-press' : 'bg-white/60',
                  ].join(' ')}
                >
                  <Text className="text-[11px] leading-none text-inkSoft">
                    {cell.a}×{cell.b}
                  </Text>
                  <Text className="text-base font-bold leading-tight text-ink">
                    {revealed ? cell.product : '?'}
                  </Text>
                </View>
              );
            }),
          )}
        </View>
      </View>
      <Text className="text-inkSoft text-sm">点格子听口诀，隐藏答案可自测～</Text>
    </View>
  );

  return (
    <View className="flex flex-col items-center gap-4">
      {segmented}
      {mode === 'practice' ? practiceView : tableView}
    </View>
  );
}

export default MultiplicationGame;
