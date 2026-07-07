/** 可复现随机数生成器类型（与 Math.random 签名一致） */
export type Rng = () => number;

export { pick } from './shuffle';

/** mulberry32：小巧的带种子伪随机数生成器 */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** [min, max] 闭区间整数 */
export function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** 从数组中按权重抽取（weights 与 arr 等长） */
export function weightedPick<T>(arr: readonly T[], weights: readonly number[], rng: Rng = Math.random): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}
