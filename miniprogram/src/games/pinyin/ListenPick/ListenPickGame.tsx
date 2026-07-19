import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { buildVariantRounds, getSyllables } from '../PinyinMatch/pinyinLogic';

const ROUND_COUNT = 8;

/**
 * 听音选拼音：每轮自动播放一个音节的拼音发音（也可点按钮重听），
 * 孩子在 4 个拼音选项中选出刚才听到的正确拼音。
 */
export function ListenPickGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, mistakes } = useScore();
  const rounds = useMemo(() => buildVariantRounds(getSyllables(), ROUND_COUNT), []);
  const [index, setIndex] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);
  const firstRef = useRef<boolean>(true);

  useEffect(() => {
    tts.speak('听一听，选出正确的拼音！');
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
      setSel(null);
    } else {
      finish();
    }
  };

  // 每轮切换自动朗读该汉字发音（tts 关闭时 no-op 安全）
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      setTimeout(() => tts.speak(rounds[index].target.char), 1300);
    } else {
      tts.speak(rounds[index].target.char);
    }
  }, [index]);

  const handle = (opt: string): void => {
    if (ended) return;
    sound.play('click');
    if (opt === round.target.pinyin) {
      setSel(opt);
      addScore(10);
      bumpCombo();
      sound.play('correct');
      tts.speak(opt);
      next();
    } else {
      addMistake();
      resetCombo();
      sound.play('wrong');
      setSel(null);
    }
  };

  return (
    <View className="flex flex-col items-center gap-4">
      <View className="text-center text-ink font-bold">
        第 {index + 1} / {rounds.length} 关 · 🎧 听一听，选出正确的拼音
      </View>

      <View
        onClick={() => tts.speak(round.target.char)}
        className="rounded-3xl bg-mint text-2xl font-extrabold text-ink px-6 py-3 shadow-soft active:scale-95 transition-all"
        style={{ touchAction: 'manipulation' }}
      >
        🔊 再听一次
      </View>

      <View className="w-full grid grid-cols-2 gap-3">
        {round.options.map((opt) => (
          <View
            key={opt}
            disabled={ended}
            onClick={() => handle(opt)}
            className={[
              'h-16 rounded-3xl font-extrabold text-2xl text-ink transition-all active:scale-95',
              sel === opt ? 'bg-mint ring-4 ring-white shadow-glow' : 'bg-white shadow-soft',
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

export default ListenPickGame;
