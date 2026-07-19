import { useEffect, useRef, useState } from 'react';

/** 工具：延时（毫秒），可在 async 流程中等待 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * useGameTimer —— 返回自激活以来经过的毫秒数。
 * active 为 false 时停止计时并归零。
 */
export function useGameTimer(active: boolean): number {
  const [ms, setMs] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!active) {
      setMs(0);
      return;
    }
    startRef.current = Date.now();
    let raf = 0;
    const tick = (): void => {
      setMs(Date.now() - startRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return ms;
}

/**
 * useCountdown —— 倒计时（秒）。归零后保持 0。
 * 用于限时挑战类玩法。
 */
export function useCountdown(seconds: number, active: boolean): number {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (!active) return;
    setLeft(seconds);
    const id = setInterval(() => {
      setLeft((l) => (l <= 1 ? 0 : l - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [seconds, active]);
  return left;
}

/**
 * computeStars —— 根据通过与否、错误数、用时计算星级（1~3）。
 * passed 为 false 时返回 0。
 */
export function computeStars(opts: {
  passed: boolean;
  mistakes: number;
  durationMs: number;
  starMistakes?: number;
  starDurationMs?: number;
}): number {
  if (!opts.passed) return 0;
  const starMistakes = opts.starMistakes ?? 3;
  const starDurationMs = opts.starDurationMs ?? 60000;

  let stars = 3;
  if (opts.mistakes > starMistakes) stars = 2;
  if (opts.mistakes > starMistakes * 2) stars = 1;
  if (opts.durationMs > starDurationMs) stars = Math.min(stars, 2);
  if (opts.durationMs > starDurationMs * 2) stars = 1;
  return Math.max(1, Math.min(3, stars));
}

/** 把毫秒格式化为 mm:ss */
export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
