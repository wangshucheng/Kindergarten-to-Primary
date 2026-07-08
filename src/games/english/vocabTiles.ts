/**
 * vocabTiles —— 将核心词汇 VOCAB 映射为 _shared 消除/配对游戏的「英语 tile 素材」。
 *
 * 统一入口：_shared/{match3,brick,goose} 的英语实例（subject==='english'）从此取词，
 * 而非内置 QuestionGenerator.english / english.json 小词库，从而与「核心词汇 510」知识网打通。
 * - word / meaning 一律来自 VOCAB；
 * - emoji 优先用 english.json 原图，缺图回退主题代表 emoji（THEME_EMOJI）；
 * - 匹配键 key = VOCAB 的 theme（如「颜色」「动物」），知识点统一为 `category:主题`；
 * - 纯函数 + 注入 seed，可复现、可单测。
 */
import { createRng } from '../../utils/rng';
import { shuffle } from '../../utils/shuffle';
import engWords from '../../data/english.json';
import { VOCAB, THEME_EMOJI } from './vocabData';

/** 原 english.json 单词 → emoji 查找表（作 emoji 回退） */
const EMOJI_BY_WORD: Record<string, string> = Object.fromEntries(
  (engWords as { words: { word: string; emoji: string }[] }).words.map((w) => [w.word, w.emoji]),
);

export interface VocabTile {
  key: string;
  label: string;
  sub: string;
  emoji: string;
  knowledgePoint: string;
}

function buildTile(w: (typeof VOCAB)[number]): VocabTile {
  return {
    key: w.theme,
    label: w.en,
    sub: w.zh,
    emoji: EMOJI_BY_WORD[w.en] ?? THEME_EMOJI[w.theme] ?? '📘',
    knowledgePoint: `category:${w.theme}`,
  };
}

/** 取 count 个 VOCAB 单词（theme 可重复），映射为 english 游戏 tile 素材。 */
export function vocabWordTiles(count: number, seed: number): VocabTile[] {
  const rng = createRng(seed);
  const n = Math.max(0, Math.min(count, VOCAB.length));
  return shuffle(VOCAB, rng).slice(0, n).map(buildTile);
}

/** 取 count 个不同 theme 的代表词（key 唯一），用于需要 key 去重的池。 */
export function vocabThemeTiles(count: number, seed: number): VocabTile[] {
  const rng = createRng(seed);
  const shuffled = shuffle(VOCAB, rng);
  const map = new Map<string, VocabTile>();
  for (const w of shuffled) {
    if (map.has(w.theme)) continue;
    map.set(w.theme, buildTile(w));
    if (map.size >= count) break;
  }
  return Array.from(map.values());
}
