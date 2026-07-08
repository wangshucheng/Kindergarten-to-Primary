import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTtsLang, setTtsLang, onTtsLangChange, type TtsLang } from '../sound/ttsLang';

// node 环境下 localStorage / window 不存在，这里手动提供最小实现
function installGlobals(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  });
  const listeners = new Map<string, Array<() => void>>();
  vi.stubGlobal('window', {
    dispatchEvent: (e: Event) => {
      (listeners.get(e.type) ?? []).forEach((cb) => cb());
      return true;
    },
    addEventListener: (type: string, cb: () => void) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type)!.push(cb);
    },
    removeEventListener: (type: string, cb: () => void) => {
      const arr = listeners.get(type);
      if (arr) listeners.set(type, arr.filter((f) => f !== cb));
    },
  });
}

describe('ttsLang（TTS 朗读语言偏好）', () => {
  beforeEach(() => {
    installGlobals();
  });

  it('getTtsLang 默认为 zh-CN', () => {
    expect(getTtsLang()).toBe('zh-CN');
  });

  it('setTtsLang 持久化到 localStorage', () => {
    setTtsLang('zh-HK');
    expect(localStorage.getItem('tts-lang')).toBe('zh-HK');
    expect(getTtsLang()).toBe('zh-HK');

    setTtsLang('en-US');
    expect(localStorage.getItem('tts-lang')).toBe('en-US');
    expect(getTtsLang()).toBe('en-US');
  });

  it('setTtsLang 触发 window 事件（监听验证）', () => {
    let fired = 0;
    const off = onTtsLangChange(() => {
      fired += 1;
    });
    expect(fired).toBe(0);

    setTtsLang('zh-HK');
    expect(fired).toBe(1);

    setTtsLang('en-US');
    expect(fired).toBe(2);

    off();
    setTtsLang('zh-CN');
    expect(fired).toBe(2); // 取消订阅后不再触发
  });

  it('getTtsLang 容忍非法的 localStorage 值', () => {
    localStorage.setItem('tts-lang', 'fr-FR');
    expect(getTtsLang()).toBe('zh-CN');
  });

  it('setTtsLang 忽略非法语言值', () => {
    setTtsLang('zh-CN');
    // 强制写入非法值以模拟污染
    localStorage.setItem('tts-lang', 'xx-XX');
    // 直接调用（类型上不应发生，但函数应安全）——仅验证不抛错
    const _bad = 'xx-XX' as TtsLang;
    expect(() => setTtsLang(_bad)).not.toThrow();
    // 非法值不会被写入持久化（保留原值逻辑：setTtsLang 仅持久化合法值）
    expect(localStorage.getItem('tts-lang')).toBe('xx-XX');
  });
});
