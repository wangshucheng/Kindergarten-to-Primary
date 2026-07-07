/**
 * TtsManager 离线朗读引擎测试（node 环境，无 jsdom 依赖）。
 *
 * 通过 vi.stubGlobal 注入 window / SpeechSynthesisUtterance 的 mock，
 * 不改动原有 8 个测试文件，也不改动 vitest 全局配置。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TtsManager } from '../sound/TtsManager';

/** 模拟 SpeechSynthesisUtterance：记录构造参数与属性赋值 */
class MockUtterance {
  text: string;
  lang = '';
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

interface MockSynth {
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  getVoices: ReturnType<typeof vi.fn>;
  onvoiceschanged: (() => void) | null;
}

function makeSynth(): MockSynth {
  return {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => []),
    onvoiceschanged: null,
  };
}

describe('TtsManager（离线 TTS 回归）', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function installSynth(): MockSynth {
    const synth = makeSynth();
    vi.stubGlobal('window', { speechSynthesis: synth });
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance as unknown as typeof SpeechSynthesisUtterance);
    return synth;
  }

  it('无 window 时构造与 speak 安全 no-op 不抛错', () => {
    vi.stubGlobal('window', undefined);
    const tts = new TtsManager();
    expect(() => tts.speak('人')).not.toThrow();
    expect(tts.isEnabled()).toBe(true);
  });

  it('无 speechSynthesis 时构造与 speak 安全 no-op 不抛错', () => {
    vi.stubGlobal('window', {});
    const tts = new TtsManager();
    expect(() => tts.speak('人')).not.toThrow();
    expect(tts.isEnabled()).toBe(true);
  });

  it('有 synth 时 speak 调用 cancel 与 speak，默认 lang=zh-CN、rate=0.9', () => {
    const synth = installSynth();
    const tts = new TtsManager();
    tts.speak('人');
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const u = synth.speak.mock.calls[0][0] as MockUtterance;
    expect(u.text).toBe('人');
    expect(u.lang).toBe('zh-CN');
    expect(u.rate).toBe(0.9);
  });

  it('speak 接受 lang 选项（英文 en-US）', () => {
    const synth = installSynth();
    const tts = new TtsManager();
    tts.speak('apple', { lang: 'en-US' });
    const u = synth.speak.mock.calls[0][0] as MockUtterance;
    expect(u.lang).toBe('en-US');
    expect(u.rate).toBe(0.9);
  });

  it('toggle 切换 isEnabled，关闭后 speak 不再触发 speechSynthesis.speak', () => {
    const synth = installSynth();
    const tts = new TtsManager();
    expect(tts.isEnabled()).toBe(true);
    const after = tts.toggle();
    expect(after).toBe(false);
    expect(tts.isEnabled()).toBe(false);
    tts.speak('人');
    expect(synth.speak).not.toHaveBeenCalled();
  });

  // —— onEnd 回调（流程前进保障，Batch B + R1–R7 核心改动）——
  it('TTS 关闭时 speak 同步调用 onEnd，保证流程前进且不触发 speechSynthesis.speak', () => {
    const synth = installSynth();
    const tts = new TtsManager();
    tts.toggle(); // 关闭朗读
    const onEnd = vi.fn();
    tts.speak('人', { onEnd });
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('无 speechSynthesis 环境时 speak 同步调用 onEnd', () => {
    vi.stubGlobal('window', {});
    const tts = new TtsManager();
    const onEnd = vi.fn();
    tts.speak('人', { onEnd });
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('空文本时 speak 同步调用 onEnd', () => {
    const synth = installSynth();
    const tts = new TtsManager();
    const onEnd = vi.fn();
    tts.speak('', { onEnd });
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('有语音时 onEnd 经 u.onend 触发：speak 成功时不立即调用，onend 触发后才调用', () => {
    const synth = installSynth();
    const tts = new TtsManager();
    const onEnd = vi.fn();
    tts.speak('人', { onEnd });
    expect(onEnd).not.toHaveBeenCalled(); // 朗读进行中，尚未结束
    const u = synth.speak.mock.calls[0][0] as MockUtterance & { onend?: () => void };
    expect(typeof u.onend).toBe('function');
    u.onend!(); // 模拟朗读结束
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('未传 onEnd 时 speak 正常触发语音且不抛错', () => {
    const synth = installSynth();
    const tts = new TtsManager();
    expect(() => tts.speak('人')).not.toThrow();
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });
});
