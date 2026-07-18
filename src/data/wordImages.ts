/**
 * wordImages —— 单词配图加载器。
 *
 * 图片由 scripts/genWordImages.mjs 批量生成到 public/images/words/，
 * 映射关系记录在 word-images.json（运行生成工具后自动更新）。
 *
 * 三级回退策略：
 *   word-images.json[word]  →  english.json 的 emoji  →  主题代表 emoji
 */
import wordImagesRaw from './word-images.json';
import eng from './english.json';
import { THEME_EMOJI } from './vocabData';

const wordImages = wordImagesRaw as Record<string, string>;

/** english.json 中的 word → emoji 映射 */
const emojiByWord: Record<string, string> = Object.fromEntries(
  (eng as { words: { word: string; emoji: string }[] }).words.map((w) => [w.word, w.emoji]),
);

/**
 * 获取单词的图片 URL（若已生成）。
 * @returns 图片路径（如 "/images/words/cat.png"）或 null
 */
export function getWordImage(word: string): string | null {
  return wordImages[word] ?? null;
}

/**
 * 获取单词的 emoji（用于无图片时回退显示）。
 * @returns emoji 字符（如 "🐱"）
 */
export function getWordEmoji(word: string, theme: string): string {
  return emojiByWord[word] ?? THEME_EMOJI[theme] ?? '📘';
}

/**
 * 判断单词是否有生成的图片。
 */
export function hasWordImage(word: string): boolean {
  return word in wordImages;
}
