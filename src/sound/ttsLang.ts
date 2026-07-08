/**
 * ttsLang —— 全局 TTS 朗读语言偏好（仅影响朗读语音，不影响界面文案）。
 *
 * 支持三种朗读语言：
 * - 'zh-CN' 普通话
 * - 'zh-HK' 粤语
 * - 'en-US' 英语
 *
 * 偏好持久化到 localStorage，并通过 window 事件 'tts-lang-change' 在多个
 * React 组件之间同步（HUD 切换 → 所有 useTTS 实例感知）。
 */
export type TtsLang = 'zh-CN' | 'zh-HK' | 'en-US';

const KEY = 'tts-lang';
const EVENT = 'tts-lang-change';

const VALID: ReadonlyArray<TtsLang> = ['zh-CN', 'zh-HK', 'en-US'];

/** 读取当前 TTS 朗读语言偏好，默认 'zh-CN' */
export function getTtsLang(): TtsLang {
  if (typeof localStorage !== 'undefined') {
    const v = localStorage.getItem(KEY);
    if (v === 'zh-CN' || v === 'zh-HK' || v === 'en-US') return v;
  }
  return 'zh-CN';
}

/** 设置 TTS 朗读语言偏好，持久化并广播事件 */
export function setTtsLang(l: TtsLang): void {
  if (!VALID.includes(l)) return;
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, l);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

/** 订阅 TTS 朗读语言偏好变化，返回取消订阅函数 */
export function onTtsLangChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
