import type { SoundType } from '../games/types';

/** 单个音符描述 */
export interface ToneNote {
  /** 频率 Hz */
  freq: number;
  /** 时长（秒） */
  dur: number;
  /** 与上一音符的间隔（秒），第一音为绝对起点偏移 */
  gap: number;
  /** 波形 */
  type: OscillatorType;
  /** 峰值音量 0~1 */
  gain: number;
}

export interface SoundPreset {
  notes: ToneNote[];
}

/**
 * 程序化音效预设：使用 OscillatorNode 合成，零素材、无版权风险。
 * 全部音效均通过 SoundManager.play(type) 触发。
 */
export const SOUND_PRESETS: Record<SoundType, SoundPreset> = {
  // 点击：清脆短促的“嘀”
  click: {
    notes: [{ freq: 880, dur: 0.08, gap: 0, type: 'triangle', gain: 0.5 }],
  },
  // 答对：上行小三度 + 大三度，明亮悦耳
  correct: {
    notes: [
      { freq: 523.25, dur: 0.12, gap: 0, type: 'sine', gain: 0.6 },
      { freq: 659.25, dur: 0.12, gap: 0.09, type: 'sine', gain: 0.6 },
      { freq: 783.99, dur: 0.16, gap: 0.18, type: 'sine', gain: 0.6 },
    ],
  },
  // 答错：低沉短促的“噗”
  wrong: {
    notes: [
      { freq: 196, dur: 0.18, gap: 0, type: 'square', gain: 0.4 },
      { freq: 146.83, dur: 0.2, gap: 0.05, type: 'square', gain: 0.4 },
    ],
  },
  // 通关：欢快琶音 C-E-G-C
  win: {
    notes: [
      { freq: 523.25, dur: 0.16, gap: 0, type: 'triangle', gain: 0.6 },
      { freq: 659.25, dur: 0.16, gap: 0.12, type: 'triangle', gain: 0.6 },
      { freq: 783.99, dur: 0.16, gap: 0.24, type: 'triangle', gain: 0.6 },
      { freq: 1046.5, dur: 0.32, gap: 0.36, type: 'triangle', gain: 0.65 },
    ],
  },
  // 升级/过关：快速上滑
  levelup: {
    notes: [
      { freq: 587.33, dur: 0.1, gap: 0, type: 'sawtooth', gain: 0.4 },
      { freq: 880, dur: 0.14, gap: 0.08, type: 'sawtooth', gain: 0.4 },
    ],
  },
};
