import type { ComponentType } from 'react';
import type { SoundManager } from '../sound/SoundManager';
import type { TtsManager } from '../sound/TtsManager';

/** 四大模块标识 */
export type ModuleKey = 'math' | 'pinyin' | 'hanzi' | 'english';

/** 优先级：P0 首版全量，P1 紧随，P2 末尾 */
export type Priority = 'P0' | 'P1' | 'P2';

/** 可触发的程序化音效类型 */
export type SoundType = 'click' | 'correct' | 'wrong' | 'win' | 'levelup';

/** 单局结果，由游戏在结束时通过 onComplete 上报 */
export interface GameResult {
  score: number;
  passed: boolean;
  stars: number;
  durationMs: number;
}

/** 游戏注册信息（含渲染组件） */
export interface GameConfig {
  id: string;
  module: ModuleKey;
  title: string;
  icon: string;
  priority: Priority;
  component: ComponentType<GameProps>;
}

/** 注入给具体游戏组件的属性 */
export interface GameProps {
  config: GameConfig;
  sound: SoundManager;
  tts: TtsManager;
  onComplete: (r: GameResult) => void;
  onExit: () => void;
}

/** 模块元信息（来自 data/config.json） */
export interface ModuleMeta {
  key: ModuleKey;
  title: string;
  icon: string;
  description?: string;
}
