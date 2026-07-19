import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { palette } from '../theme/tokens';

interface StarRatingProps {
  /** 已点亮星数 0~max */
  value: number;
  max?: number;
  size?: number;
  /** 是否逐颗弹入（结算场景推荐开启） */
  animated?: boolean;
}

/**
 * StarRating —— 星级展示（结算/成就）。
 * 高级化：点亮星逐颗弹性浮现、柔和光晕，未点亮星低调呈现。
 */
export function StarRating({ value, max = 3, size = 36, animated = true }: StarRatingProps) {
  return (
    <View className="flex items-center justify-center gap-1.5" aria-label={`${value} / ${max} 星`}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < value;
        return (
          <Text
            key={i}
            className={['leading-none inline-block', animated && filled ? 'animate-scaleIn' : ''].join(
              ' ',
            )}
            style={{
              fontSize: size,
              color: filled ? palette.lemon : '#E4D8C8',
              textShadow: filled ? '0 3px 10px rgba(255,200,80,0.55)' : 'none',
              transform: filled ? 'scale(1.06)' : 'scale(0.96)',
              animationDelay: animated && filled ? `${i * 120}ms` : undefined,
              transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), color 0.3s ease',
            }}
          >
            ★
          </Text>
        );
      })}
    </View>
  );
}
