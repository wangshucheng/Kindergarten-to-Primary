import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { shuffle } from '../../../utils/shuffle';
import eng from '../../../data/english.json';
import { VOCAB, THEME_EMOJI } from '../../../data/vocabData';

interface Word {
  word: string;
  emoji: string;
  meaning: string;
}
interface WordItem {
  id: number;
  text: string;
  emoji: string;
}

// 优先从核心词汇 VOCAB 取词出题；emoji 优先用原图，缺图回退主题代表 emoji。
const emojiByWord: Record<string, string> = Object.fromEntries(
  (eng as { words: Word[] }).words.map((w) => [w.word, w.emoji]),
);
const words: Word[] = VOCAB.map((v) => ({
  word: v.en,
  emoji: emojiByWord[v.en] ?? THEME_EMOJI[v.theme] ?? '📘',
  meaning: v.zh,
}));
const PER_ROUND = 6;
const ROUNDS = 3;

function buildRound(): { left: WordItem[]; right: WordItem[] } {
  const chosen = shuffle(words).slice(0, PER_ROUND);
  const left = shuffle(
    chosen.map((w, i) => ({ id: i, text: w.word, emoji: w.emoji })),
  );
  const right = shuffle(
    chosen.map((w, i) => ({ id: i, text: w.emoji, emoji: w.emoji })),
  );
  return { left, right };
}

/**
 * 单词图文匹配：点击左侧单词，再点击右侧对应的图片。
 */
export function WordImageGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, mistakes } = useScore();
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState(buildRound);
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);

  useEffect(() => {
    tts.speak('点击单词，连到对应的图片！');
  }, []);

  const finish = (): void => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes, durationMs });
    onComplete({ score: 0, passed: true, stars, durationMs });
  };

  const handleLeft = (p: WordItem): void => {
    if (ended || matched.has(p.id)) return;
    sound.play('click');
    tts.speak(p.text, { lang: 'en-US' });
    setSelected(p.id);
  };

  const handleRight = (p: WordItem): void => {
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
      const word = round.left.find((l) => l.id === p.id)?.text ?? '';
      if (word) tts.speak(word, { lang: 'en-US' });
      if (nm.size === PER_ROUND) {
        if (roundIndex < ROUNDS - 1) {
          sound.play('levelup');
          setRoundIndex(roundIndex + 1);
          setRound(buildRound());
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

  return (
    <View className="flex flex-col items-center gap-3">
      <View className="text-center text-ink font-bold">
        第 {roundIndex + 1} / {ROUNDS} 关 · 单词连图片
      </View>
      <View className="text-inkSoft text-sm">已连 {matched.size} / {PER_ROUND}</View>

      <View className="w-full grid grid-cols-2 gap-4">
        <View className="flex flex-col gap-2">
          {round.left.map((p) => (
            <View
              key={`w-${p.id}`}
              onClick={() => handleLeft(p)}
              disabled={isMat(p.id)}
              className={[
                'flex items-center justify-center text-center h-14 rounded-3xl font-extrabold text-xl text-ink transition-all active:scale-95',
                isMat(p.id) ? 'opacity-30 bg-white' : isSel(p.id) ? 'bg-lemon ring-4 ring-white shadow-glow' : 'bg-white shadow-soft',
              ].join(' ')}
              style={{ touchAction: 'manipulation' }}
            >
              {p.text}
            </View>
          ))}
        </View>
        <View className="flex flex-col gap-2">
          {round.right.map((p) => (
            <View
              key={`e-${p.id}`}
              onClick={() => handleRight(p)}
              disabled={isMat(p.id)}
              className={[
                'flex items-center justify-center text-center h-14 rounded-3xl text-3xl transition-all active:scale-95',
                isMat(p.id) ? 'opacity-30 bg-white' : 'bg-white shadow-soft',
              ].join(' ')}
              style={{ touchAction: 'manipulation' }}
            >
              {p.emoji}
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  function isMat(id: number): boolean {
    return matched.has(id);
  }
  function isSel(id: number): boolean {
    return selected === id;
  }
}

export default WordImageGame;
