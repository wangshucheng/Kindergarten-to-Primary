import { useCallback, useEffect, useRef, useState } from 'react';
import { TtsManager } from './TtsManager';
import { getTtsLang, onTtsLangChange, type TtsLang } from './ttsLang';

/**
 * useTTS —— TtsManager 的 React Hook 薄封装（接口 §3.7）。
 *
 * 统一暴露「中/英朗读 + 开关 + 停止」五件套，供游戏组件按学科朗读：
 * - speakZh(text, opts?)：以中文（zh-CN）朗读；
 * - speakEn(text, opts?)：以英文（en-US）朗读；
 * - toggle()：切换朗读开关，返回切换后状态；
 * - isEnabled()：当前是否开启；
 * - stop()：立即停止当前朗读。
 *
 * 设计要点：
 * - 支持注入已有 TtsManager（便于测试 / 与 GameShell 共用同一实例）；
 * - 不注入时惰性创建单例，避免重复实例化与语音叠加；
 * - 回调以 useCallback 记忆，依赖稳定，组件重渲染不会重建。
 */
export interface TtsApi {
  /** 中文朗读 */
  speakZh: (text: string, opts?: { rate?: number; onEnd?: () => void }) => void;
  /** 英文朗读 */
  speakEn: (text: string, opts?: { rate?: number; onEnd?: () => void }) => void;
  /** 切换开关，返回切换后的状态 */
  toggle: () => boolean;
  /** 当前是否开启朗读 */
  isEnabled: () => boolean;
  /** 立即停止当前朗读 */
  stop: () => void;
}

export function useTTS(manager?: TtsManager): TtsApi {
  const mgrRef = useRef<TtsManager | null>(manager ?? null);
  if (mgrRef.current === null) {
    mgrRef.current = new TtsManager();
  }
  const mgr = mgrRef.current;

  const [lang, setLang] = useState<TtsLang>(getTtsLang());
  useEffect(() => onTtsLangChange(() => setLang(getTtsLang())), []);

  const speakZh = useCallback(
    (text: string, opts?: { rate?: number; onEnd?: () => void }) => {
      mgr.speak(text, { lang, rate: opts?.rate ?? 0.9, onEnd: opts?.onEnd });
    },
    [mgr, lang],
  );

  const speakEn = useCallback(
    (text: string, opts?: { rate?: number; onEnd?: () => void }) => {
      mgr.speak(text, { lang: 'en-US', rate: opts?.rate ?? 0.9, onEnd: opts?.onEnd });
    },
    [mgr],
  );

  const toggle = useCallback(() => mgr.toggle(), [mgr]);
  const isEnabled = useCallback(() => mgr.isEnabled(), [mgr]);
  const stop = useCallback(() => mgr.stop(), [mgr]);

  return { speakZh, speakEn, toggle, isEnabled, stop };
}
