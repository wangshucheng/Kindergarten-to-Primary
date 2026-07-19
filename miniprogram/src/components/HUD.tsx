import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useEffect, useState } from 'react';
import type { SoundManager } from '../sound/SoundManager';
import type { TtsManager } from '../sound/TtsManager';
import { getTtsLang, setTtsLang, onTtsLangChange, type TtsLang } from '../sound/ttsLang';
import { moduleColors, palette } from '../theme/tokens';
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

/** 顶栏统一的圆形图标按钮 */
function IconButton({
  onClick,
  label,
  active,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      type="button"
      onClick={onClick}
      className={[
        'shrink-0 w-11 h-11 rounded-2xl text-xl grid place-items-center',
        'transition-[transform,box-shadow,background] duration-200 ease-spring active:scale-90',
        active
          ? 'bg-white shadow-soft'
          : 'bg-white/70 shadow-sm hover:bg-white hover:shadow-soft',
      ].join(' ')}
      style={{ touchAction: 'manipulation' }}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </View>
  );
}

/**
 * HUD —— 游戏顶部状态栏：标题、分数、连击、朗读开关、音效开关、返回。
 * 高级化：玻璃质感吸顶栏 + 分层胶囊 + 平滑微交互；功能与原有一致。
 */
export function HUD({ title, module, score, combo, sound, tts, onExit }: HUDProps) {
  const [on, setOn] = useState<boolean>(sound.isEnabled());
  const [ttsOn, setTtsOn] = useState<boolean>(tts.isEnabled());
  const [ttsLang, setTtlLang] = useState<TtsLang>(getTtsLang());
  const accent = palette[moduleColors[module] ?? 'peach'];

  useEffect(() => onTtsLangChange(() => setTtlLang(getTtsLang())), []);

  const toggleSound = (): void => setOn(sound.toggle());
  const toggleTts = (): void => setTtsOn(tts.toggle());

  return (
    <View className="sticky top-0 z-20 px-3 py-2.5 flex items-center gap-2 glass rounded-b-4xl">
      <IconButton onClick={onExit} label="返回" active>
        <Text className="-mt-0.5">←</Text>
      </IconButton>

      <View className="flex-1 min-w-0 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/60 text-ink font-bold truncate">
        <Text
          className="inline-block w-2.5 h-2.5 rounded-full shrink-0 animate-breathe"
          style={{ background: accent, boxShadow: `0 0 0 4px ${accent}33` }}
        />
        <Text className="truncate tracking-tightish">{title}</Text>
      </View>

      <View className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-2xl bg-gradient-to-b from-[#FFEC99] to-[#FFE066] text-ink font-extrabold shadow-sm">
        <Text>⭐</Text>
        <Text className="tabular-nums">{score}</Text>
      </View>

      {combo > 1 && (
        <View className="shrink-0 px-3 py-2 rounded-2xl bg-gradient-to-b from-[#FFC7D6] to-[#FF9FB6] text-ink font-extrabold shadow-sm animate-pop">
          🔥 {combo}
        </View>
      )}

      <View className="shrink-0 flex items-center gap-1 px-0.5">
        {(['zh-CN', 'zh-HK', 'en-US'] as TtsLang[]).map((l) => (
          <View
            key={l}
            type="button"
            onClick={() => {
              setTtsLang(l);
              setTtlLang(l);
            }}
            className={[
              'w-9 h-9 rounded-xl text-sm font-bold transition-all duration-200 ease-spring active:scale-90',
              ttsLang === l
                ? 'bg-gradient-to-b from-[#B6EED8] to-[#7FD8BB] text-ink shadow-sm'
                : 'bg-white/70 text-inkSoft hover:bg-white',
            ].join(' ')}
            style={{ touchAction: 'manipulation' }}
            aria-label={l === 'zh-CN' ? '普通话' : l === 'zh-HK' ? '粤语' : '英语'}
            aria-pressed={ttsLang === l}
          >
            {l === 'zh-CN' ? '中' : l === 'zh-HK' ? '粤' : '英'}
          </View>
        ))}
      </View>

      <IconButton onClick={toggleTts} label="朗读开关" active={ttsOn}>
        {ttsOn ? '🗣️' : '🔇'}
      </IconButton>

      <IconButton onClick={toggleSound} label="音效开关" active={on}>
        {on ? '🔊' : '🔇'}
      </IconButton>
    </View>
  );
}
