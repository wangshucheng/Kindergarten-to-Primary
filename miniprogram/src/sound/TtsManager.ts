/**
 * TtsManager —— 朗读引擎的统一入口。
 *
 * 内部通过 platform/tts 抽象层自动适配：
 * - Web 端：Web Speech API（离线、即时合成）
 * - 小程序端：预生成音频（中/英映射表 + 三级缓存）+ 云函数在线合成兜底
 *
 * 外部 API 保持不变，调用方零改动：
 * - speak(text, opts?)：朗读文本
 * - toggle() / isEnabled()：开关控制
 * - stop()：停止当前朗读
 * - dispose()：释放资源
 */
import { createTtsBackend, type TtsBackend } from '../platform/tts';

export class TtsManager {
  private enabled = true;
  private disposed = false;
  private backend: TtsBackend;

  constructor() {
    this.backend = createTtsBackend();
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
   * @param opts.category 'poetry' 时启用古诗情感音色（仅中文）
   * @param opts.onEnd 朗读结束后回调
   */
  speak(
    text: string,
    opts?: { lang?: string; rate?: number; category?: 'poetry'; onEnd?: () => void },
  ): void {
    if (!this.enabled || this.disposed) {
      opts?.onEnd?.();
      return;
    }
    if (!text) {
      opts?.onEnd?.();
      return;
    }
    this.backend.speak(text, opts ?? {});
  }

  /** 立即停止当前朗读 */
  stop(): void {
    this.backend.stop();
  }

  /** 释放资源：停止朗读并标记已释放 */
  dispose(): void {
    this.disposed = true;
    this.backend.dispose();
  }
}
