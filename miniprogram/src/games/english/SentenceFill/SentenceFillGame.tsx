import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { shuffle } from '../../../utils/shuffle';
import { createRng, type Rng } from '../../../utils/rng';
import eng from '../../../data/english.json';
import { SENTENCES } from '../sentenceData';

/** 归一化题型：display 为展示文本（含 ＿＿＿ 或中文提示），options 为选项，answer 为正确项索引 */
interface FillQuestion {
  display: string;
  options: string[];
  answer: number;
  /** 答对后朗读的完整句子 */
  speak: string;
}

type Mode = 'cloze' | 'sentence';

const clozeRaw = (eng as { sentences: { template: string; options: string[]; answer: number }[] }).sentences;

/** 原始填空题型（保留既有交互结构） */
function buildCloze(): FillQuestion[] {
  return clozeRaw.map((s) => ({
    display: s.template.replace('{blank}', '＿＿＿'),
    options: s.options,
    answer: s.answer,
    speak: s.template.replace('{blank}', s.options[s.answer]),
  }));
}

/** 基于 SENTENCES 的「句型选择」题型：给中文，4 个英文句子选项 */
function buildSentenceChoice(rng: Rng): FillQuestion[] {
  const all = SENTENCES.flatMap((p) => p.examples);
  return shuffle(all, rng).map((ex) => {
    const distractors = shuffle(
      all.filter((e) => e.en !== ex.en).map((e) => e.en),
      rng,
    ).slice(0, 3);
    const options = shuffle([ex.en, ...distractors], rng);
    return {
      display: `${ex.zh} ＿`,
      options,
      answer: options.indexOf(ex.en),
      speak: ex.en,
    };
  });
}

/**
 * 简单句练习：默认「选词填空」（读句子选词），并可切换到「句型选择」（接入核心句型 SENTENCES，中译英选句）。
 * 两种题型通过顶部分段控制切换；各自循环完毕后结算。
 */
export function SentenceFillGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, mistakes } = useScore();
  const [mode, setMode] = useState<Mode>('cloze');
  const [index, setIndex] = useState(0);
  const [wrongOpt, setWrongOpt] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);

  const questions = useMemo<FillQuestion[]>(
    () => (mode === 'cloze' ? buildCloze() : buildSentenceChoice(createRng(20240601))),
    [mode],
  );

  // 切换题型时重置进度
  useEffect(() => {
    setIndex(0);
    setWrongOpt(null);
    setEnded(false);
    endedRef.current = false;
    startRef.current = Date.now();
  }, [mode]);

  useEffect(() => {
    tts.speak('读句子，选一选！');
  }, []);

  const round = questions[index];

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
      tts.speak(round.speak, {
        lang: 'en-US',
        onEnd: () => {
          setWrongOpt(null);
          if (index < questions.length - 1) setIndex(index + 1);
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

  const segmented = (
    <View className="inline-flex rounded-3xl bg-white/60 p-1 shadow-soft">
      <View
        onClick={() => setMode('cloze')}
        className={[
          'px-3 py-2 rounded-2xl font-bold transition-all active:scale-95 text-sm',
          mode === 'cloze' ? 'bg-lemon text-ink shadow-press' : 'text-inkSoft',
        ].join(' ')}
      >
        📝 选词填空
      </View>
      <View
        onClick={() => setMode('sentence')}
        className={[
          'px-3 py-2 rounded-2xl font-bold transition-all active:scale-95 text-sm',
          mode === 'sentence' ? 'bg-lemon text-ink shadow-press' : 'text-inkSoft',
        ].join(' ')}
      >
        💬 句型选择
      </View>
    </View>
  );

  return (
    <View className="flex flex-col items-center gap-4">
      {segmented}

      <View className="text-center text-ink font-bold">
        第 {index + 1} / {questions.length} 关 · {mode === 'cloze' ? '选词填空' : '句型选择'}
      </View>

      <View className="w-full bg-white rounded-4xl shadow-soft px-6 py-6 text-center">
        <Text className="text-2xl font-extrabold text-ink leading-relaxed">{round.display}</Text>
      </View>

      <View className="w-full grid grid-cols-1 gap-3">
        {round.options.map((opt, i) => (
          <View
            key={opt}
            onClick={() => handle(i)}
            disabled={wrongOpt === i}
            className={[
              'h-14 rounded-3xl font-extrabold text-xl text-ink transition-all active:scale-95',
              wrongOpt === i ? 'bg-white/50 opacity-50 animate-shake' : 'bg-white shadow-soft',
            ].join(' ')}
            style={{ touchAction: 'manipulation' }}
          >
            {opt}
          </View>
        ))}
      </View>
    </View>
  );
}

export default SentenceFillGame;
