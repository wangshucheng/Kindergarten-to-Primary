/**
 * ttsText —— TTS 文本键与音频文件命名的纯逻辑（无 wx / DOM 依赖，可单测）。
 *
 * 命名契约（构建期脚本 scripts/genZhAudios.mjs 与云函数 tts 共用同一规则）：
 *   键   = normalizeTextKey(text)（去首尾空白、折叠内部连续空白）
 *   哈希 = sha1(`zh-CN|${键}`)
 *   云端路径 = /audio/zh/<哈希>.mp3
 */
import { sha1 } from '../utils/sha1';

/** 中文音频在云存储中的目录 */
export const ZH_AUDIO_DIR = '/audio/zh';

/** 朗读内容类别：区分普通文本与古诗，影响音色/情感模式（诗词用更贴合的童声 + 情感韵律） */
export type TtsCategory = 'general' | 'poetry';

/** 古诗朗读专属音色（腾讯云「萌趣女声」，比默认智甜更贴近童趣吟诵） */
export const POETRY_VOICE_TYPE = 101007;

/** 规范化朗读文本键：去首尾空白、折叠内部连续空白为单个空格 */
export function normalizeTextKey(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** 中文文本 → 音频文件名（跨端同一哈希规则）；category 改变音色时须一并参与哈希 */
export function zhAudioFileName(text: string, category: TtsCategory = 'general'): string {
  const salt = category === 'poetry' ? '|poetry' : '';
  return `${sha1(`zh-CN|${normalizeTextKey(text)}${salt}`)}.mp3`;
}

/** 中文文本 → 云端音频路径（/audio/zh/<hash>.mp3）；category 改变音色时路径随之不同 */
export function zhAudioPath(text: string, category: TtsCategory = 'general'): string {
  return `${ZH_AUDIO_DIR}/${zhAudioFileName(text, category)}`;
}

/** 预生成音频映射表：text → 云端相对路径（如 "/audio/zh/<hash>.mp3"） */
export type AudioMap = Record<string, string>;

/**
 * 在预生成映射表中查找文本对应的音频路径。
 * 英文映射按小写键匹配（沿用既有单词表行为），中文映射按规范化原文精确匹配。
 * @param category 'poetry' 时优先用诗词专属映射（不同音色的物理文件），回退到普通中文映射
 * @returns 命中返回 { path, kind }，未命中返回 null
 */
export function lookupMappedAudio(
  text: string,
  maps: { en: AudioMap; zh: AudioMap; zhPoetry?: AudioMap },
  category: TtsCategory = 'general',
): { path: string; kind: 'en' | 'zh' } | null {
  const key = normalizeTextKey(text);
  if (!key) return null;
  const enPath = maps.en[key.toLowerCase()];
  if (enPath) return { path: enPath, kind: 'en' };
  if (category === 'poetry' && maps.zhPoetry?.[key]) {
    return { path: maps.zhPoetry[key], kind: 'zh' };
  }
  const zhPath = maps.zh[key];
  if (zhPath) return { path: zhPath, kind: 'zh' };
  return null;
}
