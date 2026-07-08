import { useState } from 'react';
import type { SoundManager } from '../sound/SoundManager';
import type { TtsManager } from '../sound/TtsManager';
import { moduleColors } from '../theme/tokens';
import type { ModuleKey } from '../games/types';

interface HUDProps {
  title: string;
  module: ModuleKey;
  score: number;
  combo: number;
  sound: SoundManager;
  tts: TtsManager;
  onExit: () => void;
}

/**
 * HUD —— 游戏顶部状态栏：标题、分数、连击、朗读开关、音效开关、返回。
 * 音效开关通过 sound.toggle() 控制，朗读开关通过 tts.toggle() 控制，两者相互独立。
 */
export function HUD({ title, module, score, combo, sound, tts, onExit }: HUDProps) {
  const [on, setOn] = useState<boolean>(sound.isEnabled());
  const [ttsOn, setTtsOn] = useState<boolean>(tts.isEnabled());
  const accent = moduleColors[module];

  const toggleSound = (): void => {
    const next = sound.toggle();
    setOn(next);
  };

  const toggleTts = (): void => {
    const next = tts.toggle();
    setTtsOn(next);
  };

  return (
    <header
      className="sticky top-0 z-20 px-3 py-2 flex items-center gap-2 bg-white/70 backdrop-blur rounded-b-3xl shadow-soft"
    >
      <button
        type="button"
        onClick={onExit}
        className="shrink-0 w-11 h-11 rounded-2xl bg-white shadow-press text-xl active:scale-95"
        style={{ touchAction: 'manipulation' }}
        aria-label="返回"
      >
        ←
      </button>

      <div
        className="flex-1 px-3 py-1.5 rounded-2xl text-ink font-bold truncate"
        style={{ background: `var(--accent, #fff)` }}
      >
        <span
          className="inline-block w-3 h-3 rounded-full mr-2 align-middle"
          style={{ background: accent }}
        />
        {title}
      </div>

      <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-lemon/70 text-ink font-bold">
        ⭐ {score}
      </div>

      {combo > 1 && (
        <div className="shrink-0 px-3 py-1.5 rounded-2xl bg-peach/80 text-ink font-bold animate-pop">
          🔥 {combo}
        </div>
      )}

      <button
        type="button"
        onClick={toggleTts}
        className="shrink-0 w-11 h-11 rounded-2xl bg-white shadow-press text-xl active:scale-95"
        style={{ touchAction: 'manipulation' }}
        aria-label="朗读开关"
      >
        {ttsOn ? '🗣️' : '🔇'}
      </button>

      <button
        type="button"
        onClick={toggleSound}
        className="shrink-0 w-11 h-11 rounded-2xl bg-white shadow-press text-xl active:scale-95"
        style={{ touchAction: 'manipulation' }}
        aria-label="音效开关"
      >
        {on ? '🔊' : '🔇'}
      </button>
    </header>
  );
}
