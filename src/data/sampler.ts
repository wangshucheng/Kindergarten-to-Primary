/**
 * sampler —— 按级 / 按标签 / 随机抽题。
 * 封装现状 utils/rng（Rng）与 utils/shuffle（shuffle），保证可复现。
 */
import type { Rng } from '../utils/rng';
import { shuffle } from '../utils/shuffle';

/** 随机取一项（固定 rng 可复现） */
export function pickRandom<T>(arr: readonly T[], rng: Rng = Math.random): T {
  if (arr.length === 0) throw new Error('pickRandom: 数组为空');
  return arr[Math.floor(rng() * arr.length)];
}

/** 取不重复的 n 项（洗牌后截取） */
export function pickN<T>(arr: readonly T[], n: number, rng: Rng = Math.random): T[] {
  const k = Math.max(0, Math.min(n, arr.length));
  return shuffle(arr, rng).slice(0, k);
}

/** 按 level 过滤（返回洗牌后的数组，便于按级稳定抽题） */
export function pickByLevel<T extends { level?: number }>(
  arr: readonly T[],
  level: number,
  rng: Rng = Math.random,
): T[] {
  return shuffle(
    arr.filter((x) => x.level === level),
    rng,
  );
}

/** 按 tag 过滤 */
export function pickByTag<T extends { tags?: string[] }>(
  arr: readonly T[],
  tag: string,
  rng: Rng = Math.random,
): T[] {
  return shuffle(
    arr.filter((x) => Array.isArray(x.tags) && x.tags.includes(tag)),
    rng,
  );
}
