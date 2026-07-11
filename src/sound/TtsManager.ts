/**
 * TtsManager —— 基于浏览器内置 Web Speech API（window.speechSynthesis）的离线朗读引擎。
 *
 * 设计要点：
 * - 完全离线、零依赖、零模型文件，中文（zh-CN）默认可用；
 * - 与 SoundManager（程序化音效）彼此独立，开关互不影响；
 * - 游戏只允许通过 `speak(text, opts)` 触发朗读，HUD 通过 `toggle()` 控制开关；
 * - 在无 window / 无 speechSynthesis 的环境下全部安全降级为 no-op，不抛错；
 * - speak 前会 cancel 上一条，避免语音堆积；
 * - dispose() 在组件卸载时停止朗读并标记已释放。
 */
export class TtsManager {
  private enabled = true;
  private voices: SpeechSynthesisVoice[] = [];
  private disposed = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  /** 加载全部可用音色 */
  private loadVoices(): void {
    if (!('speechSynthesis' in window)) return;
    this.voices = window.speechSynthesis.getVoices();
  }

  /**
   * 按语言标签挑选最匹配的音色。
   * - zh-hk / zh-yue → 粤语音色；
   * - en → 英语音色（优先 en-US → en-GB → 任意 en*，均缺失时回退首个可用音色，
   *   而非返回 null 让浏览器默认音色错配语言）；
   * - zh（其他，含 zh-CN）→ 普通话/中文音色；
   * 任何情况下都尽量显式选中一个音色，保证有声音且 lang 已设为目标语言。
   */
  private pickVoice(lang?: string): SpeechSynthesisVoice | null {
    if (!lang) return null;
    const key = lang.toLowerCase();
    const findByPrefix = (prefix: string): SpeechSynthesisVoice | null =>
      this.voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null;

    if (key.startsWith('zh-hk') || key.startsWith('zh-yue')) {
      return findByPrefix('zh-hk') ?? findByPrefix('zh-yue');
    }
    if (key.startsWith('en')) {
      return (
        findByPrefix('en-us') ??
        findByPrefix('en-gb') ??
        findByPrefix('en') ??
        this.voices[0] ??
        null
      );
    }
    if (key.startsWith('zh')) {
      return (
        findByPrefix('zh-cn') ??
        findByPrefix('zh') ??
        this.voices[0] ??
        null
      );
    }
    return this.voices[0] ?? null;
  }

  /** 切换朗读开关，返回切换后的状态；关闭时立即停止当前朗读 */
  toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stop();
    return this.enabled;
  }

  /** 当前朗读是否开启 */
  isEnabled(): boolean {
    return this.enabled && !this.disposed;
  }

  /**
   * 朗读文本。
   * @param text 要朗读的文本
   * @param opts.lang 语言标签，默认 'zh-CN'；英文传 'en-US'
   * @param opts.rate 语速，默认 0.9（儿童稍慢）
   * @param opts.onEnd 朗读结束后回调
   */
  speak(
    text: string,
    opts?: { lang?: string; rate?: number; onEnd?: () => void },
  ): void {
    if (!this.enabled || this.disposed) {
      opts?.onEnd?.();
      return;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      opts?.onEnd?.();
      return;
    }
    if (!text) {
      opts?.onEnd?.();
      return;
    }
    window.speechSynthesis.cancel(); // 避免语音堆积
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts?.lang ?? 'zh-CN';
    u.rate = opts?.rate ?? 0.9;
    const v = this.pickVoice(opts?.lang);
    if (v) u.voice = v;
    if (opts?.onEnd) u.onend = () => opts.onEnd!();
    window.speechSynthesis.speak(u);
  }

  /** 立即停止当前朗读 */
  stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /** 释放资源：停止朗读并标记已释放 */
  dispose(): void {
    this.disposed = true;
    this.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = null;
    }
  }
}
