/**
 * wordImages —— 单词配图加载器。
 *
 * 图片由 scripts/genWordImages.mjs 批量生成到 public/images/words/，
 * 映射关系记录在 word-images.json（运行生成工具后自动更新）。
 *
 * 小程序端方案：
 *   由于 504 张图片总体积约 85MB（超过小程序 20MB 总包限制），
 *   图片必须上传到云存储/CDN，运行时通过 setCloudImageBaseUrl() 配置基础 URL。
 *   未配置 baseUrl 时返回相对路径（仅用于 Web 端调试）。
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

/** 云存储图片基础 URL（需在小程序初始化时通过 setCloudImageBaseUrl 配置） */
let cloudImageBaseUrl = '';

/**
 * 配置云存储图片基础 URL。
 * 小程序初始化时调用一次，设置图片文件所在的云端路径。
 * @example setCloudImageBaseUrl('https://your-cdn.com/images/words/')
 */
export function setCloudImageBaseUrl(url: string): void {
  cloudImageBaseUrl = url.endsWith('/') ? url : url + '/';
}

/**
 * 获取单词的图片 URL（若已生成）。
 * @returns 完整 URL（如 "https://cdn.com/images/words/cat.png"）或相对路径，或 null
 */
export function getWordImage(word: string): string | null {
  const rel = wordImages[word];
  if (!rel) return null;
  // 拼接云存储 base URL（如配置）；否则返回相对路径
  if (cloudImageBaseUrl) {
    // rel 形如 "/images/words/cat.png"，去掉前导斜杠后拼接
    return cloudImageBaseUrl + rel.replace(/^\//, '');
  }
  return rel;
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
