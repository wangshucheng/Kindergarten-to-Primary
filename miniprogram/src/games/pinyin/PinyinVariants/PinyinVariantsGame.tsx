import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import {
  buildVariantRounds,
  getSyllables,
  type VariantRound,
} from '../PinyinMatch/pinyinLogic';

const ROUND_COUNT = 10;

/**
 * 拼读变体：看汉字与释义，选出正确的拼音（含声调）。
 */
export function PinyinVariantsGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, mistakes } = useScore();
  const rounds = useMemo<VariantRound[]>(
    () => buildVariantRounds(getSyllables(), ROUND_COUNT),
    [],
  );
  const [index, setIndex] = useState(0);
  const [wrongOpt, setWrongOpt] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);

  useEffect(() => {
    tts.speak('看汉字，选出正确的拼音！');
  }, []);

  const round = rounds[index];

  const finish = (): void => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes, durationMs });
    onComplete({ score: 0, passed: true, stars, durationMs });
  };

  const handleOption = (opt: string): void => {
    if (ended) return;
    sound.play('click');
    if (opt === round.target.pinyin) {
      addScore(10);
      bumpCombo();
      sound.play('correct');
      tts.speak(round.target.char);
      setWrongOpt(null);
      if (index < rounds.length - 1) {
        setIndex(index + 1);
      } else {
        finish();
      }
    } else {
      addMistake();
      resetCombo();
      sound.play('wrong');
      setWrongOpt(opt);
    }
  };

  return (
    <View className="flex flex-col items-center gap-4">
      <View className="text-center text-ink font-bold">
        第 {index + 1} / {rounds.length} 关 · 选出正确的拼音
      </View>

      <View className="flex flex-col items-center bg-white rounded-4xl shadow-soft px-8 py-4">
        <View className="text-6xl">{round.target.emoji}</View>
        <View className="text-4xl font-extrabold text-ink mt-1">{round.target.char}</View>
        <View className="text-sm text-inkSoft">「{round.target.meaning}」怎么读？</View>
      </View>

      <View className="w-full grid grid-cols-2 gap-3">
        {round.options.map((opt) => (
          <View
            key={opt}
            onClick={() => handleOption(opt)}
            className={[
              'h-16 rounded-3xl font-extrabold text-2xl text-ink transition-all active:scale-95',
              wrongOpt === opt ? 'bg-peach/60 ring-4 ring-red-300 animate-shake' : 'bg-white shadow-soft',
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

export default PinyinVariantsGame;
