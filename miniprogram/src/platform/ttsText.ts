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

/** 规范化朗读文本键：去首尾空白、折叠内部连续空白为单个空格 */
export function normalizeTextKey(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** 中文文本 → 音频文件名（跨端同一哈希规则） */
export function zhAudioFileName(text: string): string {
  return `${sha1(`zh-CN|${normalizeTextKey(text)}`)}.mp3`;
}

/** 中文文本 → 云端音频路径（/audio/zh/<hash>.mp3） */
export function zhAudioPath(text: string): string {
  return `${ZH_AUDIO_DIR}/${zhAudioFileName(text)}`;
}

/** 预生成音频映射表：text → 云端相对路径（如 "/audio/zh/<hash>.mp3"） */
export type AudioMap = Record<string, string>;

/**
 * 在预生成映射表中查找文本对应的音频路径。
 * 英文映射按小写键匹配（沿用既有单词表行为），中文映射按规范化原文精确匹配。
 * @returns 命中返回 { path, kind }，未命中返回 null
 */
export function lookupMappedAudio(
  text: string,
  maps: { en: AudioMap; zh: AudioMap },
): { path: string; kind: 'en' | 'zh' } | null {
  const key = normalizeTextKey(text);
  if (!key) return null;
  const enPath = maps.en[key.toLowerCase()];
  if (enPath) return { path: enPath, kind: 'en' };
  const zhPath = maps.zh[key];
  if (zhPath) return { path: zhPath, kind: 'zh' };
  return null;
}
