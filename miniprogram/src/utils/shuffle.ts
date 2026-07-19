import type { Rng } from './rng';

/**
 * Fisher-Yates 洗牌。传入 rng 可复现，否则使用 Math.random。
 * 返回新数组，不修改原数组。
 */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** 取数组随机一项 */
export function pick<T>(arr: readonly T[], rng: Rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** 取不重复的 n 个随机项 */
export function sample<T>(arr: readonly T[], n: number, rng: Rng = Math.random): T[] {
  return shuffle(arr, rng).slice(0, Math.min(n, arr.length));
}
