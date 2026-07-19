/**
 * wordImages —— 单词配图加载器。
 *
 * 图片由 scripts/genWordImages.mjs 批量生成到 public/images/words/，
 * 映射关系记录在 word-images.json（运行生成工具后自动更新）。
 *
 * 小程序端方案：
 *   由于 504 张图片总体积约 85MB（超过小程序 20MB 总包限制），
 *   图片必须上传到微信云存储，运行时通过 cloud:// 文件 ID 访问。
 *   具体访问见 components/CloudImage —— 用 wx.cloud.downloadFile 把 cloud:// 文件 ID
 *   下载到本地临时文件后交给 <Image>，无需文件公开读权限、也无需域名白名单。
 *
 * 三级回退策略：
 *   word-images.json[word]  →  english.json 的 emoji  →  主题代表 emoji
 */
import wordImagesRaw from './word-images.json';
import eng from './english.json';
import { THEME_EMOJI } from './vocabData';
import { buildImageFileId } from '../cloud-config';

const wordImages = wordImagesRaw as Record<string, string>;

/** english.json 中的 word → emoji 映射 */
const emojiByWord: Record<string, string> = Object.fromEntries(
  (eng as { words: { word: string; emoji: string }[] }).words.map((w) => [w.word, w.emoji]),
);

/**
 * 获取单词的图片 cloud 文件 ID（若已生成）。
 * 返回形如 "cloud://<env>.<suffix>/images/words/cat.png"，
 * 由 CloudImage 组件解析为临时 URL；非小程序环境 / 无图时返回 null。
 * @returns cloud:// 文件 ID 或 null
 */
export function getWordImage(word: string): string | null {
  const rel = wordImages[word];
  if (!rel) return null;
  // 仅在微信小程序环境返回云文件 ID；Web 端返回相对路径供 public/ 资源使用
  if (typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function') {
    return buildImageFileId(rel);
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
