import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TtsManager } from '../sound/TtsManager';

function makeVoice(lang: string): SpeechSynthesisVoice {
  return {
    lang,
    name: `voice-${lang}`,
    voiceURI: `uri-${lang}`,
    localService: true,
    default: false,
  } as SpeechSynthesisVoice;
}

let spoken: SpeechSynthesisUtterance | null = null;
let voices: SpeechSynthesisVoice[];

function installSynth(): void {
  const synth = {
    getVoices: () => voices,
    speak: (u: SpeechSynthesisUtterance) => {
      spoken = u;
    },
    cancel: () => {},
    onvoiceschanged: null as ((() => void) | null),
  };
  // 在构造 TtsManager 前装好 window / speechSynthesis / SpeechSynthesisUtterance
  vi.stubGlobal('window', {
    speechSynthesis: synth,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      lang = 'zh-CN';
      rate = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
}

beforeEach(() => {
  spoken = null;
  voices = [makeVoice('zh-CN'), makeVoice('zh-HK'), makeVoice('en-US'), makeVoice('en-GB')];
  installSynth();
});

describe('TtsManager pickVoice 音色选择', () => {
  it('zh-HK → 粤语音色', () => {
    const mgr = new TtsManager();
    const v = (mgr as unknown as { pickVoice(l: string): SpeechSynthesisVoice | null }).pickVoice(
      'zh-HK',
    );
    expect(v).not.toBeNull();
    expect(v!.lang).toBe('zh-HK');
  });

  it('zh-yue 也被识别为粤语音色', () => {
    voices = [makeVoice('zh-yue'), makeVoice('zh-CN'), makeVoice('en-US')];
    const mgr = new TtsManager();
    const v = (mgr as unknown as { pickVoice(l: string): SpeechSynthesisVoice | null }).pickVoice(
      'zh-yue',
    );
    expect(v).not.toBeNull();
    expect(v!.lang).toBe('zh-yue');
  });

  it('en → 英语音色', () => {
    const mgr = new TtsManager();
    const v = (mgr as unknown as { pickVoice(l: string): SpeechSynthesisVoice | null }).pickVoice(
      'en-US',
    );
    expect(v).not.toBeNull();
    expect(v!.lang).toBe('en-US');
  });

  it('zh-CN → 普通话音色', () => {
    const mgr = new TtsManager();
    const v = (mgr as unknown as { pickVoice(l: string): SpeechSynthesisVoice | null }).pickVoice(
      'zh-CN',
    );
    expect(v).not.toBeNull();
    expect(v!.lang).toBe('zh-CN');
  });

  it('给定 lang 找不到对应 voice 返回 null', () => {
    voices = [makeVoice('zh-CN'), makeVoice('en-US')];
    const mgr = new TtsManager();
    const v = (mgr as unknown as { pickVoice(l: string): SpeechSynthesisVoice | null }).pickVoice(
      'zh-HK',
    );
    expect(v).toBeNull();
  });

  it('无 voices 时 pickVoice 返回 null', () => {
    voices = [];
    const mgr = new TtsManager();
    const v = (mgr as unknown as { pickVoice(l: string): SpeechSynthesisVoice | null }).pickVoice(
      'zh-CN',
    );
    expect(v).toBeNull();
  });
});

describe('TtsManager speak 按 lang 设置音色及回退', () => {
  it('speak 按 lang 选中对应音色', () => {
    const mgr = new TtsManager();
    mgr.speak('你好', { lang: 'en-US' });
    expect(spoken).not.toBeNull();
    expect(spoken!.lang).toBe('en-US');
    expect(spoken!.voice!.lang).toBe('en-US');
    expect(spoken!.rate).toBeCloseTo(0.9);
  });

  it('找不到对应音色时不设置 voice（让浏览器按 lang 自动回退）', () => {
    voices = [makeVoice('zh-CN'), makeVoice('en-US')];
    const mgr = new TtsManager();
    mgr.speak('你好', { lang: 'zh-HK' });
    expect(spoken).not.toBeNull();
    expect(spoken!.lang).toBe('zh-HK');
    expect(spoken!.voice).toBeNull(); // 粤语无音色 → 回退
  });
});
