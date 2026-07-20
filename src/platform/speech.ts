/**
 * 语音识别抽象层 —— 统一 Web Speech API 与小程序方案。
 *
 * Web 端：window.SpeechRecognition / webkitSpeechRecognition（浏览器原生，
 *   需在 https 或 localhost 下、且在用户手势中触发）。
 * 小程序端：当前未接入同声传译插件，标记为不支持（业务层应提供降级方案）。
 *
 * 业务代码只依赖本抽象，不直接调用浏览器 / wx 的语音识别 API。
 */

export interface SpeechResult {
  /** 识别出的文本（最终或临时结果） */
  transcript: string;
  /** 置信度 0~1 */
  confidence: number;
  /** 是否为最终结果 */
  isFinal: boolean;
}

export interface ListenOptions {
  /** 语言标签，默认 'en-US' */
  lang?: string;
  /** 最多候选数 */
  maxAlternatives?: number;
  /** 是否返回临时结果（边说边识别） */
  interimResults?: boolean;
  /** 单轮最长识别时长（ms），到时自动停止 */
  timeoutMs?: number;
  /** 识别到结果回调 */
  onResult: (r: SpeechResult) => void;
  /** 出错回调（含 unsupported） */
  onError?: (code: string) => void;
  /** 识别结束（无论成败）回调 */
  onEnd?: () => void;
}

export interface SpeechBackend {
  /** 当前环境是否支持语音识别 */
  readonly supported: boolean;
  /** 开始一轮识别 */
  listen(opts: ListenOptions): void;
  /** 主动停止 */
  stop(): void;
  /** 释放资源 */
  dispose(): void;
}

const isMiniProgram =
  typeof (globalThis as { wx?: { getSystemInfoSync?: unknown } }).wx !== 'undefined' &&
  typeof (globalThis as { wx?: { getSystemInfoSync?: unknown } }).wx?.getSystemInfoSync === 'function';

// Web 实现 ------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: (() => void) | null;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

class WebSpeechBackend implements SpeechBackend {
  readonly supported: boolean;
  private recognition: AnyRecognition | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const Ctor =
      (typeof window !== 'undefined' &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    this.supported = !!Ctor;
    if (Ctor) {
      const r = new Ctor() as AnyRecognition;
      r.continuous = false;
      r.interimResults = true;
      r.maxAlternatives = 1;
      this.recognition = r;
    }
  }

  listen(opts: ListenOptions): void {
    if (!this.recognition) {
      opts.onError?.('unsupported');
      opts.onEnd?.();
      return;
    }
    this.stop();
    const r = this.recognition;
    r.lang = opts.lang ?? 'en-US';
    r.interimResults = opts.interimResults ?? true;
    r.maxAlternatives = opts.maxAlternatives ?? 1;
    r.onresult = (ev: any) => {
      let best: SpeechResult | null = null;
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const alt = res[0];
        const candidate: SpeechResult = {
          transcript: alt?.transcript ?? '',
          confidence: typeof alt?.confidence === 'number' ? alt.confidence : 0,
          isFinal: !!res.isFinal,
        };
        if (!best || candidate.isFinal) best = candidate;
      }
      if (best) opts.onResult(best);
    };
    r.onerror = (ev: any) => {
      const code = typeof ev?.error === 'string' ? ev.error : 'error';
      opts.onError?.(code);
    };
    r.onend = () => {
      this.clearTimer();
      opts.onEnd?.();
    };
    if (opts.timeoutMs && opts.timeoutMs > 0) {
      this.timer = setTimeout(() => this.stop(), opts.timeoutMs);
    }
    try {
      r.start();
    } catch {
      this.clearTimer();
      opts.onError?.('start-failed');
      opts.onEnd?.();
    }
  }

  stop(): void {
    this.clearTimer();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* ignore */
      }
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  dispose(): void {
    this.stop();
  }
}

// 小程序实现（暂不支持）------------------------------------------------------

class WxSpeechBackend implements SpeechBackend {
  readonly supported = false;
  listen(opts: ListenOptions): void {
    opts.onError?.('unsupported');
    opts.onEnd?.();
  }
  stop(): void {
    /* no-op */
  }
  dispose(): void {
    /* no-op */
  }
}

export function createSpeechBackend(): SpeechBackend {
  return isMiniProgram ? new WxSpeechBackend() : new WebSpeechBackend();
}
