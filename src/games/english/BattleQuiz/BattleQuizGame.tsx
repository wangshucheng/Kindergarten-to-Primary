import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { shuffle } from '../../../utils/shuffle';
import { pick, createRng, type Rng } from '../../../utils/rng';
import eng from '../../../data/english.json';

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

const words = (eng as { words: Word[] }).words;
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
      window.setTimeout(() => tts.speak(prompt), 1300);
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
      window.setTimeout(() => setFlash(null), 300);
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
      window.setTimeout(() => setFlash(null), 300);
      if (next <= 0) {
        finish(false);
        return;
      }
    }
    setQIndex((i) => (i + 1) % questions.length);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center text-ink font-bold">⚔️ 答题大作战</div>

      <div className="w-full flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm text-inkSoft mb-1">👾 怪兽</div>
          <div className="h-4 w-full rounded-full bg-white/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(monsterHp / MONSTER_MAX) * 100}%`, background: '#FFB3C6' }}
            />
          </div>
        </div>
        <div className={`text-5xl transition-transform ${flash === 'monster' ? 'scale-125' : ''}`}>
          👾
        </div>
      </div>

      <div className="w-full flex items-center justify-between gap-3">
        <div className="text-5xl transition-transform">{flash === 'player' ? '🥴' : '🦸'}</div>
        <div className="flex-1">
          <div className="text-sm text-inkSoft mb-1 text-right">🦸 我</div>
          <div className="h-4 w-full rounded-full bg-white/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(playerHp / PLAYER_MAX) * 100}%`, background: '#95E1C9' }}
            />
          </div>
        </div>
      </div>

      <div className="w-full bg-white rounded-4xl shadow-soft px-6 py-5 text-center">
        <p className="text-xl font-extrabold text-ink">{q.prompt}</p>
      </div>

      <div className="w-full grid grid-cols-2 gap-3">
        {q.options.map((opt) => (
          <button
            key={opt}
            onClick={() => handle(opt)}
            className="h-14 rounded-3xl font-extrabold text-xl text-ink bg-white shadow-soft active:scale-95 transition-all"
            style={{ touchAction: 'manipulation' }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default BattleQuizGame;
