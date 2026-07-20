/**
 * SpeechManager —— 语音识别引擎统一入口，封装 platform/speech 抽象层。
 * 与 TtsManager / SoundManager 并列，由需要语音识别的游戏（如主题寻宝）使用。
 */
import {
  createSpeechBackend,
  type ListenOptions,
  type SpeechBackend,
  type SpeechResult,
} from '../platform/speech';

export class SpeechManager {
  private backend: SpeechBackend;

  constructor() {
    this.backend = createSpeechBackend();
  }

  /** 当前环境是否支持语音识别（如浏览器未提供 Web Speech API 则为 false） */
  isSupported(): boolean {
    return this.backend.supported;
  }

  listen(opts: ListenOptions): void {
    this.backend.listen(opts);
  }

  stop(): void {
    this.backend.stop();
  }

  dispose(): void {
    this.backend.dispose();
  }
}

export type { SpeechResult };
