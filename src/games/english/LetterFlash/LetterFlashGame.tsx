import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { buildFlashRound, type FlashCard } from './letterFlashLogic';

const CARDS = 10;
const TIME_LIMIT = 6000; // 每张卡的限时（ms）
const TIME_BONUS_FULL = 8; // 抢答速度满额奖励

type Phase = 'front' | 'back' | 'result';

/** 沙漏：fraction 为剩余沙量比例（1=满，0=空） */
function Hourglass({ fraction, running }: { fraction: number; running: boolean }) {
  const f = Math.max(0, Math.min(1, fraction));
  const topSurfaceY = 10 + (1 - f) * 60;
  const bottomSurfaceY = 130 - (1 - f) * 60;
  const leftX = (y: number, top: boolean) => (top ? 15 + ((y - 10) / 60) * 35 : 50 - ((y - 70) / 60) * 35);
  const rightX = (y: number, top: boolean) => (top ? 85 - ((y - 10) / 60) * 35 : 50 + ((y - 70) / 60) * 35);
  const topSand = `${leftX(topSurfaceY, true)},${topSurfaceY} ${rightX(topSurfaceY, true)},${topSurfaceY} 50,70`;
  const bottomSand = `50,70 ${leftX(bottomSurfaceY, false)},${bottomSurfaceY} ${rightX(bottomSurfaceY, false)},${bottomSurfaceY}`;
  const SAND = '#FBBF24';
  const GLASS = '#475569';
  return (
    <svg viewBox="0 0 100 140" className="h-40 w-32 drop-shadow-sm" aria-hidden>
      {/* 外壳 */}
      <rect x="12" y="6" width="76" height="6" rx="3" fill={GLASS} />
      <rect x="12" y="128" width="76" height="6" rx="3" fill={GLASS} />
      {/* 玻璃 */}
      <polygon points="18,12 82,12 50,70" fill="#E0F2FE" stroke={GLASS} strokeWidth="2" />
      <polygon points="50,70 18,128 82,128" fill="#E0F2FE" stroke={GLASS} strokeWidth="2" />
      {/* 上沙 */}
      <polygon points={topSand} fill={SAND} />
      {/* 下沙 */}
      <polygon points={bottomSand} fill={SAND} />
      {/* 颈口流沙 */}
      {running && f > 0 && f < 1 && (
        <rect x="49" y="70" width="2" height="6" fill={SAND}>
          <animate attributeName="height" values="3;9;3" dur="0.6s" repeatCount="indefinite" />
        </rect>
      )}
      <circle cx="50" cy="70" r="2.5" fill={GLASS} />
    </svg>
  );
}

export function LetterFlashGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, combo, mistakesRef, scoreRef } = useScore();
  const [index, setIndex] = useState(0);
  const [cards] = useState<FlashCard[]>(() => buildFlashRound(CARDS, Date.now() & 0xffffffff));
  const [phase, setPhase] = useState<Phase>('front');
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [ended, setEnded] = useState(false);

  const startRef = useRef(Date.now());
  const endedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef(0);

  const card = cards[index];

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  useEffect(() => () => stopTimer(), [stopTimer]);

  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    onComplete({
      score: scoreRef.current,
      passed: true,
      stars: computeStars({ passed: true, mistakes: mistakesRef.current, durationMs }),
      durationMs,
      knowledgePoints: ['letter-flash'],
    });
  }, [onComplete, scoreRef, mistakesRef]);

  const next = useCallback(() => {
    if (index + 1 >= CARDS) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
    setPhase('front');
    setSuccess(false);
    setTimeLeft(TIME_LIMIT);
  }, [index, finish]);

  const timeout = useCallback(() => {
    if (phase !== 'back' || ended) return;
    stopTimer();
    setSuccess(false);
    setPhase('result');
    addMistake();
    resetCombo();
    sound.play('wrong');
    window.setTimeout(next, 1300);
  }, [phase, ended, addMistake, resetCombo, sound, next, stopTimer]);

  const buzz = useCallback(() => {
    if (phase !== 'back' || ended) return;
    stopTimer();
    const left = Math.max(0, deadlineRef.current - Date.now());
    const bonus = Math.round((left / TIME_LIMIT) * TIME_BONUS_FULL);
    setSuccess(true);
    setPhase('result');
    addScore(10 + bonus);
    bumpCombo();
    sound.play('correct');
    tts.speak(card.example, { lang: 'en-US' });
    window.setTimeout(next, 1100);
  }, [phase, ended, card, addScore, bumpCombo, sound, tts, next, stopTimer]);

  const flip = useCallback(() => {
    if (phase !== 'front' || ended) return;
    sound.play('click');
    setPhase('back');
    tts.speak(card.letter, { lang: 'en-US', rate: 0.85 });
    window.setTimeout(() => tts.speak(card.example, { lang: 'en-US', rate: 0.85 }), 650);
    deadlineRef.current = Date.now() + TIME_LIMIT;
    setTimeLeft(TIME_LIMIT);
    timerRef.current = setInterval(() => {
      const left = Math.max(0, deadlineRef.current - Date.now());
      setTimeLeft(left);
      if (left <= 0) {
        stopTimer();
        timeout();
      }
    }, 80);
  }, [phase, ended, card, sound, tts, timeout, stopTimer]);

  const comboBadge = combo > 1 ? `🔥 连击 x${combo}` : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between px-2 text-base font-bold text-ink/70">
        <span>
          第 {index + 1} / {CARDS} 张
        </span>
        {comboBadge && <span className="rounded-full bg-mint/30 px-3 py-1 text-mint">{comboBadge}</span>}
      </div>

      <div className="relative flex items-center justify-center gap-6">
        {/* 卡片 */}
        <div className="relative h-72 w-60" style={{ perspective: 1000 }}>
          <div
            className="relative h-full w-full transition-transform duration-500"
            style={{ transformStyle: 'preserve-3d', transform: phase === 'front' ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
          >
            {/* 正面 */}
            <div
              className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-4 border-sky/40 bg-gradient-to-br from-sky to-sky/70 text-white shadow-xl active:scale-95"
              style={{ backfaceVisibility: 'hidden' }}
              onClick={flip}
            >
              <span className="text-8xl font-extrabold drop-shadow">{card.letter}</span>
              <span className="mt-3 rounded-full bg-white/25 px-4 py-1 text-lg font-bold">👆 点我翻牌</span>
            </div>
            {/* 背面 */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-4 border-mint/50 bg-gradient-to-br from-mint to-mint/70 p-4 text-center text-ink shadow-xl"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <span className="text-6xl">{card.emoji}</span>
              <span className="mt-2 text-3xl font-extrabold lowercase">{card.example}</span>
              <span className="mt-2 rounded-full bg-cream/80 px-3 py-1 text-base font-bold text-ink/80">{card.tip}</span>
            </div>
          </div>

          {/* 结果浮层 */}
          {phase === 'result' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-ink/70 text-center text-white">
              {success ? (
                <>
                  <span className="text-6xl">🎉</span>
                  <span className="mt-2 text-2xl font-extrabold">答对啦！</span>
                </>
              ) : (
                <>
                  <span className="text-6xl">⏰</span>
                  <span className="mt-2 text-2xl font-extrabold">时间到！</span>
                  <span className="mt-1 text-lg">翻卡失败</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 沙漏 */}
        <div className="flex flex-col items-center">
          <Hourglass fraction={timeLeft / TIME_LIMIT} running={phase === 'back'} />
          <span className="mt-1 text-xl font-extrabold text-ink/70">{Math.ceil(timeLeft / 1000)}s</span>
        </div>
      </div>

      {/* 抢答按钮 */}
      <button
        type="button"
        disabled={phase !== 'back'}
        onClick={buzz}
        className="h-16 w-64 rounded-full bg-lemon text-2xl font-extrabold text-ink shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
      >
        📢 我会读！
      </button>
    </div>
  );
}
