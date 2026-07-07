import type { SoundType } from '../games/types';
import { SOUND_PRESETS, type ToneNote } from './soundPresets';

/**
 * SoundManager —— 基于 Web Audio API 的程序化音效引擎。
 *
 * 设计要点：
 * - 不依赖任何音频素材文件，全部用 OscillatorNode 合成；
 * - AudioContext 须在用户首次交互后 resume（浏览器自动播放策略），
 *   因此游戏内首次 pointer 事件会调用 `resume()` 解锁；
 * - 游戏只允许通过 `play(type)` 触发音效，HUD 通过 `toggle()` 控制开关。
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  /** 懒创建并解锁 AudioContext（必须在用户手势中调用一次） */
  resume(): void {
    const ctx = this.ensureCtx();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  /** 开关音效，返回切换后的状态 */
  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** 播放指定类型音效 */
  play(type: SoundType): void {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const preset = SOUND_PRESETS[type];
    const base = ctx.currentTime + 0.001;
    for (const note of preset.notes) {
      this.playTone(ctx, this.master, note, base);
    }
  }

  private playTone(
    ctx: AudioContext,
    dest: GainNode,
    note: ToneNote,
    base: number,
  ): void {
    const start = base + note.gap;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type;
    osc.frequency.setValueAtTime(note.freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(note.gain, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(start);
    osc.stop(start + note.dur + 0.03);
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.28;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }
}

export default SoundManager;
