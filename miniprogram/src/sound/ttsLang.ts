/**
 * ttsLang —— 全局 TTS 朗读语言偏好（仅影响朗读语音，不影响界面文案）。
 *
 * 支持三种朗读语言：
 * - 'zh-CN' 普通话
 * - 'zh-HK' 粤语
 * - 'en-US' 英语
 *
 * 偏好通过 platform/storage 持久化（Web: localStorage / 小程序: wx.storage），
 * 并通过 window 事件 'tts-lang-change' 在多个 React 组件之间同步
 * （HUD 切换 → 所有 useTTS 实例感知）。
 */
import { storage } from '../platform/storage';

export type TtsLang = 'zh-CN' | 'zh-HK' | 'en-US';

const KEY = 'tts-lang';
const EVENT = 'tts-lang-change';

const VALID: ReadonlyArray<TtsLang> = ['zh-CN', 'zh-HK', 'en-US'];

/** 读取当前 TTS 朗读语言偏好，默认 'zh-CN' */
export function getTtsLang(): TtsLang {
  const v = storage.getItem(KEY);
  if (v === 'zh-CN' || v === 'zh-HK' || v === 'en-US') return v;
  return 'zh-CN';
}

/** 设置 TTS 朗读语言偏好，持久化并广播事件 */
export function setTtsLang(l: TtsLang): void {
  if (!VALID.includes(l)) return;
  storage.setItem(KEY, l);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(EVENT));
  }
}

/** 订阅 TTS 朗读语言偏好变化，返回取消订阅函数 */
export function onTtsLangChange(cb: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
