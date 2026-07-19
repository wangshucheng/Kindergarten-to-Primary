import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { buildMemoryTiles, type MemoryTile } from './flipLogic';

const PAIRS = 6;

/**
 * 翻牌记忆（带拼音）：翻开两张相同汉字的卡片即可消除。
 */
export function FlipMemoryGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, mistakes } = useScore();
  const tiles = useMemo<MemoryTile[]>(() => buildMemoryTiles(PAIRS), []);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);

  useEffect(() => {
    tts.speak('翻开两张一样的字就消除啦！');
  }, []);

  const finish = (): void => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes, durationMs });
    onComplete({ score: 0, passed: true, stars, durationMs });
  };

  const handle = (tile: MemoryTile): void => {
    if (ended || busy) return;
    if (matched.has(tile.pairKey)) return;
    if (flipped.includes(tile.id)) return;
    sound.play('click');
    tts.speak(tile.card.char);

    const nf = [...flipped, tile.id];
    setFlipped(nf);

    if (nf.length === 2) {
      const [a, b] = nf;
      const ta = tiles.find((t) => t.id === a);
      const tb = tiles.find((t) => t.id === b);
      if (ta && tb && ta.pairKey === tb.pairKey) {
        const nm = new Set(matched);
        nm.add(ta.pairKey);
        setMatched(nm);
        setFlipped([]);
        addScore(10);
        bumpCombo();
        sound.play('correct');
        if (nm.size === PAIRS) finish();
      } else {
        addMistake();
        resetCombo();
        sound.play('wrong');
        setBusy(true);
        setTimeout(() => {
          setFlipped([]);
          setBusy(false);
        }, 800);
      }
    }
  };

  const cols = PAIRS <= 4 ? 4 : 4;

  return (
    <View className="flex flex-col items-center gap-3">
      <View className="text-center text-ink font-bold">翻开两张一样的字就消除啦！</View>
      <View className="text-inkSoft text-sm">已配对 {matched.size} / {PAIRS}</View>

      <View
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, width: '100%', maxWidth: 360 }}
      >
        {tiles.map((t) => {
          const isUp = flipped.includes(t.id) || matched.has(t.pairKey);
          return (
            <View
              key={t.id}
              onClick={() => handle(t)}
              disabled={isUp}
              className={[
                'aspect-square rounded-3xl flex flex-col items-center justify-center transition-all duration-150 active:scale-95',
                isUp
                  ? matched.has(t.pairKey)
                    ? 'bg-mint/60'
                    : 'bg-sky shadow-press'
                  : 'bg-peach shadow-soft',
              ].join(' ')}
              style={{ touchAction: 'manipulation' }}
            >
              {isUp ? (
                <>
                  <Text className="text-2xl font-extrabold text-ink leading-none">{t.card.char}</Text>
                  <Text className="text-2xl text-inkSoft">{t.card.pinyin}</Text>
                </>
              ) : (
                <Text className="text-3xl">❓</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default FlipMemoryGame;
