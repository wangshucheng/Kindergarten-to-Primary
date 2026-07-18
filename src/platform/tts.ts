/**
 * TTS 抽象层 —— 统一 Web Speech API 与微信同声传译插件。
 *
 * Web 端：window.speechSynthesis（离线、即时合成播放）
 * 小程序端：微信同声传译插件 WechatSI（云端合成 → 临时文件 → InnerAudioContext 播放）
 *
 * 语言映射：
 *   Web: 'zh-CN' / 'en-US'
 *   小程序: 'zh_CN' / 'en_US'
 *
 * 适配差异：
 * - Web 的 speak() 是同步触发，onend 回调在播放结束时触发
 * - 小程序的 textToSpeech() 是异步回调，success 后获得文件路径再播放
 *   onEnd 需在 InnerAudioContext.onEnded 中触发
 */

export interface TtsBackend {
  /** 朗读文本 */
  speak(
    text: string,
    opts: { lang?: string; rate?: number; onEnd?: () => void },
  ): void;
  /** 立即停止当前朗读 */
  stop(): void;
  /** 释放资源 */
  dispose(): void;
  /** 预加载音色（Web 端有意义，小程序端 no-op） */
  loadVoices?(): void;
}

// ---------------------------------------------------------------------------
// 语言标签转换：Web 标准格式 → 小程序格式
// ---------------------------------------------------------------------------
function toWxLang(lang: string): 'zh_CN' | 'en_US' {
  if (lang.toLowerCase().startsWith('en')) return 'en_US';
  return 'zh_CN';
}

// ---------------------------------------------------------------------------
// Web 实现：基于 Web Speech API
// ---------------------------------------------------------------------------

class WebTtsBackend implements TtsBackend {
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
  }

  private pickVoice(lang?: string): SpeechSynthesisVoice | null {
    if (!lang || this.voices.length === 0) return null;
    const key = lang.toLowerCase();
    const findByPrefix = (prefix: string): SpeechSynthesisVoice | null =>
      this.voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null;

    if (key.startsWith('zh-hk') || key.startsWith('zh-yue')) {
      return findByPrefix('zh-hk') ?? findByPrefix('zh-yue');
    }
    if (key.startsWith('en')) {
      return findByPrefix('en-us') ?? findByPrefix('en-gb') ?? findByPrefix('en') ?? this.voices[0] ?? null;
    }
    if (key.startsWith('zh')) {
      return findByPrefix('zh-cn') ?? findByPrefix('zh') ?? this.voices[0] ?? null;
    }
    return this.voices[0] ?? null;
  }

  speak(text: string, opts: { lang?: string; rate?: number; onEnd?: () => void }): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
      opts?.onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts?.lang ?? 'zh-CN';
    u.rate = opts?.rate ?? 0.9;
    const v = this.pickVoice(opts?.lang);
    if (v) u.voice = v;
    if (opts?.onEnd) u.onend = () => opts.onEnd!();
    window.speechSynthesis.speak(u);
  }

  stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  dispose(): void {
    this.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = null;
    }
  }
}

// ---------------------------------------------------------------------------
// 小程序实现：基于微信同声传译插件
// ---------------------------------------------------------------------------

class WxTtsBackend implements TtsBackend {
  private plugin: { textToSpeech: (opts: unknown) => void } | null = null;
  private currentAudio: { stop?: () => void; destroy?: () => void } | null = null;

  constructor() {
    // 延迟加载插件，避免在未配置插件时报错
    try {
      // @ts-expect-error requirePlugin 是小程序运行时注入的全局函数
      this.plugin = requirePlugin('WechatSI');
    } catch {
      this.plugin = null;
    }
  }

  speak(text: string, opts: { lang?: string; rate?: number; onEnd?: () => void }): void {
    if (!this.plugin || !text) {
      opts?.onEnd?.();
      return;
    }

    // 停止上一个播放
    this.stop();

    const lang = toWxLang(opts?.lang ?? 'zh-CN');
    this.plugin.textToSpeech({
      lang,
      content: text,
      success: (res: { filename: string }) => {
        const audio = wx.createInnerAudioContext();
        audio.src = res.filename;
        audio.onEnded(() => {
          opts?.onEnd?.();
          audio.destroy();
          this.currentAudio = null;
        });
        audio.onError(() => {
          opts?.onEnd?.();
          audio.destroy();
          this.currentAudio = null;
        });
        this.currentAudio = audio;
        audio.play();
      },
      fail: () => {
        opts?.onEnd?.();
      },
    });
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.stop?.();
      this.currentAudio.destroy?.();
      this.currentAudio = null;
    }
  }

  dispose(): void {
    this.stop();
    this.plugin = null;
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

export function createTtsBackend(): TtsBackend {
  if (typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function') {
    return new WxTtsBackend();
  }
  return new WebTtsBackend();
}
