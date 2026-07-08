import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'peach' | 'mint' | 'sky' | 'lemon' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClass: Record<Variant, string> = {
  peach: 'bg-peach text-ink shadow-press',
  mint: 'bg-mint text-ink shadow-press',
  sky: 'bg-sky text-ink shadow-press',
  lemon: 'bg-lemon text-ink shadow-press',
  ghost: 'bg-white/70 text-ink border-2 border-white shadow-soft',
};

const sizeClass: Record<Size, string> = {
  sm: 'text-sm px-4 py-2 rounded-2xl min-h-[40px]',
  md: 'text-base px-6 py-3 rounded-3xl min-h-[48px]',
  lg: 'text-lg px-8 py-4 rounded-3xl min-h-[56px]',
};

/**
 * Button —— 低龄可爱按钮：大圆角、按压回弹、最小触控区 ≥44px。
 * 统一使用原生 onPointerDown/Up/Cilck；触摸友好（touch-action: manipulation）。
 */
export function Button({
  variant = 'peach',
  size = 'md',
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center font-round font-bold select-none',
        'transition-transform duration-100 active:scale-95',
        'disabled:opacity-50 disabled:active:scale-100',
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(' ')}
      style={{ touchAction: 'manipulation', userSelect: 'none' }}
    >
      {children}
    </button>
  );
}
