import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { shuffle } from '../../../utils/shuffle';
import { pick, createRng, type Rng } from '../../../utils/rng';
import eng from '../../../data/english.json';
import { VOCAB, THEME_EMOJI } from '../../../data/vocabData';

interface Word {
  word: string;
  emoji: string;
  meaning: string;
}
interface Question {
  prompt: string;
  options: string[];
  answer: string;
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
const QUESTION_COUNT = 8;
const MONSTER_MAX = 100;
const PLAYER_MAX = 100;
const ATTACK = 20;
const HURT = 25;

function buildQuestions(count: number, seed = Date.now()): Question[] {
  const rng: Rng = createRng(seed);
  const qs: Question[] = [];
  for (let i = 0; i < count; i++) {
    const target = pick(words, rng);
    const others = words.filter((w) => w.word !== target.word).map((w) => w.word);
    const options = shuffle([target.word, ...shuffle(others, rng).slice(0, 3)], rng);
    qs.push({ prompt: `「${target.meaning}」用英语怎么说？`, options, answer: target.word });
  }
  return qs;
}

/**
 * 答题大作战（答对攻击类格斗）：答对削弱怪兽，答错自己掉血，击败怪兽即获胜。
 */
export function BattleQuizGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, addMistake, mistakes } = useScore();
  const questions = useMemo<Question[]>(() => buildQuestions(QUESTION_COUNT), []);
  const [qIndex, setQIndex] = useState(0);
  const [monsterHp, setMonsterHp] = useState(MONSTER_MAX);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX);
  const [flash, setFlash] = useState<'player' | 'monster' | null>(null);
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);
  const firstRef = useRef<boolean>(true);

  useEffect(() => {
    tts.speak('答对问题攻击怪兽，答错自己掉血，击败怪兽获胜！');
  }, []);

  // 每题先播报中文题意；首题延迟 1300ms，避免与挂载玩法说明互相取消
  useEffect(() => {
    const prompt = questions[qIndex].prompt;
    if (firstRef.current) {
      firstRef.current = false;
      setTimeout(() => tts.speak(prompt), 1300);
    } else {
      tts.speak(prompt);
    }
  }, [qIndex]);

  const q = questions[qIndex];

  const finish = (passed: boolean): void => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    const stars = passed
      ? computeStars({ passed: true, mistakes, durationMs, starDurationMs: 120000 })
      : 0;
    onComplete({ score: 0, passed, stars, durationMs });
  };

  const handle = (opt: string): void => {
    if (ended) return;
    sound.play('click');
    tts.speak(opt, { lang: 'en-US' });
    if (opt === q.answer) {
      addScore(10);
      sound.play('correct');
      setFlash('monster');
      const next = Math.max(0, monsterHp - ATTACK);
      setMonsterHp(next);
      setTimeout(() => setFlash(null), 300);
      if (next <= 0) {
        sound.play('win');
        finish(true);
        return;
      }
    } else {
      addMistake();
      sound.play('wrong');
      setFlash('player');
      const next = Math.max(0, playerHp - HURT);
      setPlayerHp(next);
      setTimeout(() => setFlash(null), 300);
      if (next <= 0) {
        finish(false);
        return;
      }
    }
    setQIndex((i) => (i + 1) % questions.length);
  };

  return (
    <View className="flex flex-col items-center gap-4">
      <View className="text-center text-ink font-bold">⚔️ 答题大作战</View>

      <View className="w-full flex items-center justify-between gap-3">
        <View className="flex-1">
          <View className="text-sm text-inkSoft mb-1">👾 怪兽</View>
          <View className="h-4 w-full rounded-full bg-white/60 overflow-hidden">
            <View
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(monsterHp / MONSTER_MAX) * 100}%`, background: '#FFB3C6' }}
            />
          </View>
        </View>
        <View className={`text-5xl transition-transform ${flash === 'monster' ? 'scale-125' : ''}`}>
          👾
        </View>
      </View>

      <View className="w-full flex items-center justify-between gap-3">
        <View className="text-5xl transition-transform">{flash === 'player' ? '🥴' : '🦸'}</View>
        <View className="flex-1">
          <View className="text-sm text-inkSoft mb-1 text-right">🦸 我</View>
          <View className="h-4 w-full rounded-full bg-white/60 overflow-hidden">
            <View
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(playerHp / PLAYER_MAX) * 100}%`, background: '#95E1C9' }}
            />
          </View>
        </View>
      </View>

      <View className="w-full bg-white rounded-4xl shadow-soft px-6 py-5 text-center">
        <Text className="text-xl font-extrabold text-ink">{q.prompt}</Text>
      </View>

      <View className="w-full grid grid-cols-2 gap-3">
        {q.options.map((opt) => (
          <View
            key={opt}
            onClick={() => handle(opt)}
            className="h-14 rounded-3xl font-extrabold text-xl text-ink bg-white shadow-soft active:scale-95 transition-all"
            style={{ touchAction: 'manipulation' }}
          >
            {opt}
          </View>
        ))}
      </View>
    </View>
  );
}

export default BattleQuizGame;
