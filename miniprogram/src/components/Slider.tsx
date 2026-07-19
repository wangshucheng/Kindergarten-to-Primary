import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import type { ReactNode, ReactElement } from 'react';
import type { CardTone } from './Card';
import { palette } from '../theme/tokens';
import { useDrag } from '../utils/useDrag';

export interface SliderProps {
  content: ReactNode;
  tone?: CardTone;
  disabled?: boolean;
  /** 轻点（tap）回调；在 useDrag 判定位移很小时触发 */
  onTap?: () => void;
  /** 拖拽到某方向结束时的回调（华容道滑块归位） */
  onDragTo?: (dir: 'up' | 'down' | 'left' | 'right') => void;
  className?: string;
}

/**
 * Slider —— 滑块原语（华容道）。
 * 默认 tap 交互；若启用拖拽（onDragTo），用 useDrag 判定方向。
 * 颜色取自 design token，禁止魔法颜色字符串。
 */
export function Slider({
  content,
  tone = 'peach',
  disabled,
  onTap,
  onDragTo,
  className = '',
}: SliderProps): ReactElement {
  const drag = useDrag({
    onEnd: (dx, dy) => {
      if (!onDragTo) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) onTap?.();
        return;
      }
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        onTap?.();
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) onDragTo(dx > 0 ? 'right' : 'left');
      else onDragTo(dy > 0 ? 'down' : 'up');
    },
  });

  return (
    <View
      role="slider"
      aria-disabled={disabled}
      className={[
        'flex items-center justify-center rounded-3xl font-round text-ink shadow-soft',
        'select-none transition-all active:scale-95 min-h-[64px] p-3 cursor-pointer',
        disabled ? 'opacity-50 cursor-default' : '',
        className,
      ].join(' ')}
      style={{ background: palette[tone], touchAction: 'none' }}
      {...drag.bind}
      onClick={disabled ? undefined : onTap}
    >
      {content}
    </View>
  );
}
