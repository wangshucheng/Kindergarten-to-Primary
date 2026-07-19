import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import type { ButtonHTMLAttributes, ReactNode, PointerEvent } from 'react';
import { createRipple } from '../utils/motion';

type Variant = 'peach' | 'mint' | 'sky' | 'lemon' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

/**
 * 各变体：柔和渐变底 + 顶部内高光，营造轻盈的立体质感。
 */
const variantClass: Record<Variant, string> = {
  peach:
    'text-ink bg-gradient-to-b from-[#FFC7D6] to-[#FF9FB6] shadow-soft hover:shadow-lift',
  mint:
    'text-ink bg-gradient-to-b from-[#B6EED8] to-[#7FD8BB] shadow-soft hover:shadow-lift',
  sky: 'text-ink bg-gradient-to-b from-[#BFE0FF] to-[#8FC2FB] shadow-soft hover:shadow-lift',
  lemon:
    'text-ink bg-gradient-to-b from-[#FFEC99] to-[#FFD84D] shadow-soft hover:shadow-lift',
  ghost:
    'text-ink glass hover:bg-white/80 shadow-sm hover:shadow-soft',
};

const sizeClass: Record<Size, string> = {
  sm: 'text-sm px-4 py-2 rounded-2xl min-h-[40px]',
  md: 'text-base px-6 py-3 rounded-3xl min-h-[48px]',
  lg: 'text-lg px-8 py-4 rounded-3xl min-h-[56px]',
};

/**
 * Button —— 高级可爱按钮：柔和渐变、顶部高光、悬浮上浮、按压回弹、点击涟漪。
 * 保持原 API（variant/size）向后兼容；最小触控区 ≥40px；触摸友好。
 */
export function Button({
  variant = 'peach',
  size = 'md',
  className = '',
  children,
  disabled,
  onPointerDown,
  ...rest
}: ButtonProps) {
  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!disabled) createRipple(e);
    onPointerDown?.(e);
  };

  return (
    <View
      {...rest}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      className={[
        'relative overflow-hidden isolate',
        'inline-flex items-center justify-center gap-1.5 font-round font-bold select-none',
        'shadow-insetTop', // 顶部内高光
        'transition-[transform,box-shadow] duration-200 ease-spring',
        'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]',
        'disabled:opacity-45 disabled:shadow-sm disabled:hover:translate-y-0 disabled:active:scale-100 disabled:cursor-not-allowed',
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(' ')}
      style={{ touchAction: 'manipulation', userSelect: 'none' }}
    >
      {children}
    </View>
  );
}
