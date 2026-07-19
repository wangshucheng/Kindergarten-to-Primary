import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import type { ReactNode, ReactElement } from 'react';
import { Card, type CardTone } from './Card';

export interface BrickProps {
  emoji?: ReactNode;
  label?: ReactNode;
  sub?: ReactNode;
  tone?: CardTone;
  selected?: boolean;
  matched?: boolean;
  wrong?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Brick —— 砖/卡原语（薄包 Card，slab 变体，供砖了个砖/配对使用）。
 * 统一正方形比例与圆角，复用 Card 的状态样式（selected/matched/wrong）。
 */
export function Brick({
  emoji,
  label,
  sub,
  tone = 'white',
  selected,
  matched,
  wrong,
  disabled,
  onClick,
  className = '',
}: BrickProps): ReactElement {
  return (
    <Card
      emoji={emoji}
      label={label}
      sub={sub}
      tone={tone}
      selected={selected}
      matched={matched}
      wrong={wrong}
      disabled={disabled}
      onClick={onClick}
      className={['w-full aspect-square text-base', className].join(' ')}
    />
  );
}
