import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { buildLetterRound, type LetterItem } from './letterLogic';

const PER_ROUND = 6;
const ROUNDS = 3;

/**
 * 26 字母大小写配对：点击大写，再点击对应的小写。
 */
export function LetterCaseGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, mistakes } = useScore();
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState(() => buildLetterRound(PER_ROUND, Date.now() + 1));
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);

  useEffect(() => {
    tts.speak('把大写和小写连起来！');
  }, []);

  const finish = (): void => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes, durationMs });
    onComplete({ score: 0, passed: true, stars, durationMs });
  };

  const handleUpper = (p: LetterItem): void => {
    if (ended || matched.has(p.id)) return;
    sound.play('click');
    setSelected(p.id);
  };

  const handleLower = (p: LetterItem): void => {
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
      tts.speak(p.char, { lang: 'en-US' });
      if (nm.size === PER_ROUND) {
        if (roundIndex < ROUNDS - 1) {
          sound.play('levelup');
          setRoundIndex(roundIndex + 1);
          setRound(buildLetterRound(PER_ROUND, Date.now() + roundIndex + 2));
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

  const isSel = (id: number) => selected === id;
  const isMat = (id: number) => matched.has(id);

  return (
    <View className="flex flex-col items-center gap-3">
      <View className="text-center text-ink font-bold">
        第 {roundIndex + 1} / {ROUNDS} 关 · 把大小写连起来
      </View>
      <View className="text-inkSoft text-sm">已连 {matched.size} / {PER_ROUND}</View>

      <View className="w-full grid grid-cols-2 gap-4">
        <View className="flex flex-col gap-2">
          {round.upper.map((p) => (
            <View
              key={`u-${p.id}`}
              onClick={() => handleUpper(p)}
              disabled={isMat(p.id)}
              className={[
                'h-14 rounded-3xl font-extrabold text-3xl text-ink transition-all active:scale-95',
                isMat(p.id) ? 'opacity-30 bg-white' : isSel(p.id) ? 'bg-lemon ring-4 ring-white shadow-glow' : 'bg-white shadow-soft',
              ].join(' ')}
              style={{ touchAction: 'manipulation' }}
            >
              {p.char}
            </View>
          ))}
        </View>
        <View className="flex flex-col gap-2">
          {round.lower.map((p) => (
            <View
              key={`l-${p.id}`}
              onClick={() => handleLower(p)}
              disabled={isMat(p.id)}
              className={[
                'h-14 rounded-3xl font-extrabold text-3xl text-ink transition-all active:scale-95',
                isMat(p.id) ? 'opacity-30 bg-white' : 'bg-white shadow-soft',
              ].join(' ')}
              style={{ touchAction: 'manipulation' }}
            >
              {p.char}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default LetterCaseGame;
