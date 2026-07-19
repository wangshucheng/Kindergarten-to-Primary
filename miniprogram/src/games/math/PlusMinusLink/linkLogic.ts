import { createRng, randomInt, pick, type Rng } from '../../../utils/rng';
import { shuffle } from '../../../utils/shuffle';

export type Op = '+' | '-';

export interface LinkLevel {
  count: number;
  ops: Op[];
  max: number;
}

export interface LinkItem {
  id: number;
  kind: 'eq' | 'ans';
  label: string;
  pairKey: number;
}

export interface LinkRound {
  items: LinkItem[];
  equations: LinkItem[];
  answers: LinkItem[];
  total: number;
}

/** 依据关卡配置生成“算式 ↔ 答案”配对 */
export function generateRound(level: LinkLevel, seed = Date.now()): LinkRound {
  const rng: Rng = createRng(seed);
  const equations: LinkItem[] = [];
  const answers: LinkItem[] = [];

  for (let i = 0; i < level.count; i++) {
    const op = pick(level.ops, rng);
    let a: number;
    let b: number;
    let result: number;
    if (op === '+') {
      a = randomInt(rng, 1, Math.max(2, level.max - 1));
      b = randomInt(rng, 1, Math.max(1, level.max - a));
      result = a + b;
    } else {
      a = randomInt(rng, 2, level.max);
      b = randomInt(rng, 1, a);
      result = a - b;
    }
    const text = `${a}${op}${b}`;
    equations.push({ id: i * 2, kind: 'eq', label: text, pairKey: i });
    answers.push({ id: i * 2 + 1, kind: 'ans', label: String(result), pairKey: i });
  }

  const eqShuffled = shuffle(equations, rng);
  const ansShuffled = shuffle(answers, rng);
  // 交错排列：算式在左列、答案在右列
  const items = [...eqShuffled, ...ansShuffled];

  return { items, equations: eqShuffled, answers: ansShuffled, total: level.count };
}
