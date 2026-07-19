import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { generateRound, type LinkItem, type LinkLevel } from './linkLogic';
import linkData from '../../../data/math.json';

const levels = (linkData as { plusMinusLink: { levels: LinkLevel[] } }).plusMinusLink.levels;

/**
 * 加减连连看：点击算式再点击对应答案，配对成功即可连线消除。
 */
export function PlusMinusLinkGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, mistakes } = useScore();
  const [levelIndex, setLevelIndex] = useState(0);
  const [round, setRound] = useState<ReturnType<typeof generateRound>>(() =>
    generateRound(levels[0]),
  );
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);

  useEffect(() => {
    tts.speak('连线算式与答案！');
  }, []);

  const matchedCount = matched.size / 2;

  const finish = (): void => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes, durationMs });
    onComplete({ score: 0, passed: true, stars, durationMs });
  };

  const handleItem = (item: LinkItem): void => {
    if (ended) return;
    if (matched.has(item.id)) return;
    sound.play('click');

    if (selected === null) {
      setSelected(item.id);
      return;
    }
    if (selected === item.id) {
      setSelected(null);
      return;
    }

    const first = round.items.find((i) => i.id === selected);
    if (!first) {
      setSelected(item.id);
      return;
    }

    if (first.kind !== item.kind && first.pairKey === item.pairKey) {
      const nm = new Set(matched);
      nm.add(first.id);
      nm.add(item.id);
      setMatched(nm);
      setSelected(null);
      addScore(10);
      bumpCombo();
      sound.play('correct');
      if (nm.size === round.items.length) {
        if (levelIndex < levels.length - 1) {
          sound.play('levelup');
          const ni = levelIndex + 1;
          setLevelIndex(ni);
          setRound(generateRound(levels[ni]));
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

  const isSelected = (id: number) => selected === id;
  const isMatched = (id: number) => matched.has(id);

  const renderItem = (item: LinkItem) => (
    <View
      key={item.id}
      disabled={isMatched(item.id)}
      onClick={() => handleItem(item)}
      className={[
        'flex items-center justify-center text-center h-16 rounded-3xl font-extrabold text-2xl text-ink select-none transition-all duration-150',
        isMatched(item.id)
          ? 'opacity-30 scale-90 bg-white'
          : isSelected(item.id)
            ? 'bg-lemon ring-4 ring-white shadow-glow scale-105'
            : 'bg-white shadow-soft active:scale-95',
      ].join(' ')}
      style={{ touchAction: 'manipulation' }}
    >
      {item.label}
    </View>
  );

  const leftItems = useMemo(() => round.equations, [round]);
  const rightItems = useMemo(() => round.answers, [round]);

  return (
    <View className="flex flex-col items-center gap-3">
      <View className="text-center text-ink font-bold">
        第 {levelIndex + 1} / {levels.length} 关 · 连线算式与答案！
      </View>
      <View className="text-inkSoft text-sm">已连 {matchedCount} / {round.total}</View>

      <View className="w-full grid grid-cols-2 gap-6">
        <View className="flex flex-col gap-3">
          {leftItems.map(renderItem)}
        </View>
        <View className="flex flex-col gap-3">
          {rightItems.map(renderItem)}
        </View>
      </View>
    </View>
  );
}

export default PlusMinusLinkGame;
