/**
 * 字母音闪电卡 —— 纯逻辑层（不依赖浏览器 API，可在 node 环境单测）。
 *
 * 每张卡对应一个字母，附带：例词、例词 emoji、发音指引（短音提示）。
 * 出题用种子化随机，保证同种子可复现。
 */
import { createRng } from '../../../utils/rng';
import { shuffle } from '../../../utils/shuffle';

export interface PhonicsInfo {
  /** 例词（小写） */
  example: string;
  /** 例词 emoji */
  emoji: string;
  /** 短音发音指引（中文友好） */
  tip: string;
}

/** 26 个字母的自然拼读提示，key 为大写字母 */
export const PHONICS: Record<string, PhonicsInfo> = {
  A: { example: 'apple', emoji: '🍎', tip: '/æ/ 像“啊”的短音' },
  B: { example: 'ball', emoji: '⚽', tip: '/b/ 双唇闭合“波”' },
  C: { example: 'cat', emoji: '🐱', tip: '/k/ 喉咙小咳“科”' },
  D: { example: 'dog', emoji: '🐶', tip: '/d/ 舌尖抵上“得”' },
  E: { example: 'egg', emoji: '🥚', tip: '/e/ 微笑短“诶”' },
  F: { example: 'fish', emoji: '🐟', tip: '/f/ 上齿咬唇“夫”' },
  G: { example: 'gift', emoji: '🎁', tip: '/g/ 喉咙“哥”' },
  H: { example: 'hand', emoji: '✋', tip: '/h/ 哈气“喝”' },
  I: { example: 'ice', emoji: '🧊', tip: '/ɪ/ 短“衣”' },
  J: { example: 'juice', emoji: '🧃', tip: '/dʒ/ “之”' },
  K: { example: 'key', emoji: '🔑', tip: '/k/ “科”' },
  L: { example: 'lion', emoji: '🦁', tip: '/l/ 舌尖弹“了”' },
  M: { example: 'milk', emoji: '🥛', tip: '/m/ 双唇“唔”' },
  N: { example: 'nose', emoji: '👃', tip: '/n/ 鼻音“嗯”' },
  O: { example: 'orange', emoji: '🍊', tip: '/ɒ/ 短“喔”' },
  P: { example: 'pig', emoji: '🐷', tip: '/p/ 双唇“坡”' },
  Q: { example: 'queen', emoji: '👑', tip: '/kw/ “夸”' },
  R: { example: 'rabbit', emoji: '🐰', tip: '/r/ 卷舌“若”' },
  S: { example: 'sun', emoji: '☀️', tip: '/s/ 嘶嘶“丝”' },
  T: { example: 'tree', emoji: '🌳', tip: '/t/ 舌尖“特”' },
  U: { example: 'umbrella', emoji: '☂️', tip: '/ʌ/ 短“阿”' },
  V: { example: 'violin', emoji: '🎻', tip: '/v/ 咬唇“呜”' },
  W: { example: 'water', emoji: '💧', tip: '/w/ 圆唇“呜”' },
  X: { example: 'box', emoji: '📦', tip: '/ks/ “克斯”' },
  Y: { example: 'yo-yo', emoji: '🪀', tip: '/j/ “耶”' },
  Z: { example: 'zebra', emoji: '🦓', tip: '/z/ 嘶“兹”' },
};

/** 全部字母（大写） */
export const LETTERS: string[] = Object.keys(PHONICS);

export interface FlashCard {
  letter: string;
  example: string;
  emoji: string;
  tip: string;
}

export function getPhonics(letter: string): PhonicsInfo | undefined {
  return PHONICS[letter.toUpperCase()];
}

/**
 * 生成一局闪电卡（默认 10 张，互不重复）。
 * 同 seed 可复现，便于测试与回放。
 */
export function buildFlashRound(count: number, seed = Date.now() & 0xffffffff): FlashCard[] {
  const n = Math.max(0, Math.min(count, LETTERS.length));
  const rng = createRng(seed >>> 0);
  const chosen = shuffle(LETTERS, rng).slice(0, n);
  return chosen.map((L) => {
    const info = PHONICS[L];
    return { letter: L, example: info.example, emoji: info.emoji, tip: info.tip };
  });
}
