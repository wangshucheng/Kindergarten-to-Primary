/**
 * 主题寻宝 —— 纯逻辑层（不依赖浏览器 API，可在 node 环境单测）。
 *
 * 随机生成一条语音指令：
 *  - 颜色类："Find something red"   → 目标为对应颜色圆 emoji
 *  - 实物类："Find a book"          → 目标为对应实物 emoji
 * 并生成若干选项（含 1 个正确 + 若干个干扰项），用种子化随机洗牌。
 */
import { createRng } from '../../../utils/rng';
import { shuffle } from '../../../utils/shuffle';

export type TreasureType = 'object' | 'color';

export interface TreasureOption {
  /** 展示用 emoji */
  key: string;
  /** 匹配词（实物词或颜色名，小写） */
  word: string;
  /** 是否为正确答案 */
  isTarget: boolean;
}

export interface TreasureRound {
  type: TreasureType;
  /** 完整指令文本，如 "Find a book" */
  instruction: string;
  /** 目标词，用于语音跟读与匹配，如 "book" */
  targetWord: string;
  /** 选项（已洗牌） */
  options: TreasureOption[];
}

const COLORS: { name: string; emoji: string }[] = [
  { name: 'red', emoji: '🔴' },
  { name: 'blue', emoji: '🔵' },
  { name: 'yellow', emoji: '🟡' },
  { name: 'green', emoji: '🟢' },
  { name: 'purple', emoji: '🟣' },
  { name: 'orange', emoji: '🟠' },
  { name: 'pink', emoji: '🩷' },
  { name: 'brown', emoji: '🤎' },
  { name: 'black', emoji: '⚫' },
  { name: 'white', emoji: '⚪' },
];

const OBJECTS: { word: string; emoji: string }[] = [
  { word: 'book', emoji: '📚' },
  { word: 'cat', emoji: '🐱' },
  { word: 'dog', emoji: '🐶' },
  { word: 'apple', emoji: '🍎' },
  { word: 'ball', emoji: '⚽' },
  { word: 'sun', emoji: '☀️' },
  { word: 'star', emoji: '⭐' },
  { word: 'fish', emoji: '🐟' },
  { word: 'car', emoji: '🚗' },
  { word: 'tree', emoji: '🌳' },
  { word: 'flower', emoji: '🌸' },
  { word: 'egg', emoji: '🥚' },
  { word: 'cake', emoji: '🍰' },
  { word: 'milk', emoji: '🥛' },
  { word: 'duck', emoji: '🦆' },
  { word: 'moon', emoji: '🌙' },
];

const OPTION_COUNT = 6;

/**
 * 生成一局寻宝回合。同 seed 可复现。
 * @param optionCount 选项总数（含 1 个目标），默认 6
 */
export function generateTreasureRound(
  seed = Date.now() & 0xffffffff,
  optionCount = OPTION_COUNT,
): TreasureRound {
  const rng = createRng(seed >>> 0);
  const useColor = rng() < 0.5;
  const need = Math.max(2, Math.min(optionCount, useColor ? COLORS.length : OBJECTS.length));

  if (useColor) {
    const pool = shuffle(COLORS, rng);
    const target = pool[0];
    const distractors = pool.slice(1, need);
    const options = shuffle(
      [
        { key: target.emoji, word: target.name, isTarget: true },
        ...distractors.map((d) => ({ key: d.emoji, word: d.name, isTarget: false })),
      ],
      rng,
    );
    return {
      type: 'color',
      instruction: `Find something ${target.name}`,
      targetWord: target.name,
      options,
    };
  }

  const pool = shuffle(OBJECTS, rng);
  const target = pool[0];
  const distractors = pool.slice(1, need);
  const options = shuffle(
    [
      { key: target.emoji, word: target.word, isTarget: true },
      ...distractors.map((d) => ({ key: d.emoji, word: d.word, isTarget: false })),
    ],
    rng,
  );
  return {
    type: 'object',
    instruction: `Find a ${target.word}`,
    targetWord: target.word,
    options,
  };
}
