import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import {
  buildMatchRounds,
  getSyllables,
  type MatchRound,
} from './pinyinLogic';

const ROUND_COUNT = 8;

/**
 * 声母×韵母拼读：看音节（汉字+拼音+图），分别选对声母与韵母。
 */
export function PinyinMatchGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, mistakes } = useScore();
  const rounds = useMemo<MatchRound[]>(
    () => buildMatchRounds(getSyllables(), ROUND_COUNT),
    [],
  );
  const [index, setIndex] = useState(0);
  const [selInitial, setSelInitial] = useState<string | null>(null);
  const [selFinal, setSelFinal] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);

  useEffect(() => {
    tts.speak('看拼音，选出正确的声母和韵母！');
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

  const next = (): void => {
    if (index < rounds.length - 1) {
      setIndex(index + 1);
      setSelInitial(null);
      setSelFinal(null);
    } else {
      finish();
    }
  };

  const handleInitial = (opt: string): void => {
    if (ended) return;
    sound.play('click');
    if (opt === round.target.initial) {
      setSelInitial(opt);
      if (selFinal === round.target.final) {
        addScore(10);
        bumpCombo();
        sound.play('correct');
        tts.speak(round.target.char);
        next();
      }
    } else {
      addMistake();
      resetCombo();
      sound.play('wrong');
      setSelInitial(null);
    }
  };

  const handleFinal = (opt: string): void => {
    if (ended) return;
    sound.play('click');
    if (opt === round.target.final) {
      setSelFinal(opt);
      if (selInitial === round.target.initial) {
        addScore(10);
        bumpCombo();
        sound.play('correct');
        tts.speak(round.target.char);
        next();
      }
    } else {
      addMistake();
      resetCombo();
      sound.play('wrong');
      setSelFinal(null);
    }
  };

  return (
    <View className="flex flex-col items-center gap-4">
      <View className="text-center text-ink font-bold">
        第 {index + 1} / {rounds.length} 关 · 选出正确的声母和韵母
      </View>

      <View className="flex flex-col items-center bg-white rounded-4xl shadow-soft px-8 py-4">
        <View className="text-6xl">{round.target.emoji}</View>
        <View className="text-3xl font-extrabold text-ink mt-1">{round.target.pinyin}</View>
        <View className="text-xl text-ink">{round.target.char}</View>
        <View className="text-sm text-inkSoft">{round.target.meaning}</View>
      </View>

      <View className="w-full">
        <View className="text-inkSoft text-sm mb-1">声母</View>
        <View className="grid grid-cols-4 gap-2">
          {round.initialOptions.map((opt) => (
            <View
              key={opt}
              onClick={() => handleInitial(opt)}
              className={[
                'h-14 rounded-3xl font-extrabold text-2xl text-ink transition-all active:scale-95',
                selInitial === opt ? 'bg-mint ring-4 ring-white shadow-glow' : 'bg-white shadow-soft',
              ].join(' ')}
              style={{ touchAction: 'manipulation' }}
            >
              {opt}
            </View>
          ))}
        </View>
      </View>

      <View className="w-full">
        <View className="text-inkSoft text-sm mb-1">韵母</View>
        <View className="grid grid-cols-4 gap-2">
          {round.finalOptions.map((opt) => (
            <View
              key={opt}
              onClick={() => handleFinal(opt)}
              className={[
                'h-14 rounded-3xl font-extrabold text-2xl text-ink transition-all active:scale-95',
                selFinal === opt ? 'bg-sky ring-4 ring-white shadow-glow' : 'bg-white shadow-soft',
              ].join(' ')}
              style={{ touchAction: 'manipulation' }}
            >
              {opt}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default PinyinMatchGame;
