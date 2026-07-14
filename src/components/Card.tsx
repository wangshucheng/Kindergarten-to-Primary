import type { CSSProperties, ReactNode, PointerEvent } from 'react';
import { createRipple } from '../utils/motion';

export type CardTone = 'peach' | 'mint' | 'sky' | 'lemon' | 'cream' | 'white';

/** 各色调：柔和渐变底，替代原平涂，提升质感 */
const toneBg: Record<CardTone, string> = {
  peach: 'bg-gradient-to-br from-[#FFC7D6] to-[#FFB3C6]',
  mint: 'bg-gradient-to-br from-[#B6EED8] to-[#95E1C9]',
  sky: 'bg-gradient-to-br from-[#BFE0FF] to-[#A0D2FF]',
  lemon: 'bg-gradient-to-br from-[#FFEC99] to-[#FFE066]',
  cream: 'bg-gradient-to-br from-white to-[#FFF3E3]',
  white: 'bg-white',
};

interface CardProps {
  emoji?: ReactNode;
  label?: ReactNode;
  sub?: ReactNode;
  selected?: boolean;
  matched?: boolean;
  disabled?: boolean;
  wrong?: boolean;
  tone?: CardTone;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Card —— 通用卡片/磁贴，用于翻牌、配对、连线等玩法。
 * 高级化：柔和渐变底 + 顶部内高光 + 弹性微交互 + 点击涟漪；
 * 状态（选中/匹配/错误）视觉更清晰，API 完全保持向后兼容。
 */
export function Card({
  emoji,
  label,
  sub,
  selected,
  matched,
  disabled,
  wrong,
  tone = 'white',
  onClick,
  className = '',
  style,
}: CardProps) {
  const stateClass = matched
    ? 'opacity-40 scale-95 saturate-50'
    : selected
      ? 'ring-4 ring-white shadow-glow -translate-y-1 scale-[1.04]'
      : wrong
        ? 'ring-4 ring-red-300 animate-shake'
        : 'shadow-soft hover:-translate-y-1 hover:shadow-lift';

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!disabled && !matched) createRipple(e);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={handlePointerDown}
      className={[
        'relative flex flex-col items-center justify-center gap-1 overflow-hidden isolate',
        'rounded-3xl font-round text-ink select-none shadow-insetTop',
        'transition-[transform,box-shadow,opacity] duration-200 ease-spring active:scale-95',
        'min-h-[64px] min-w-[64px] p-3',
        toneBg[tone],
        disabled ? 'cursor-default' : 'cursor-pointer',
        stateClass,
        className,
      ].join(' ')}
      style={{ touchAction: 'manipulation', userSelect: 'none', ...style }}
    >
      {emoji != null && <div className="text-3xl leading-none drop-shadow-sm">{emoji}</div>}
      {label != null && (
        <div className="text-lg font-bold leading-tight text-center">{label}</div>
      )}
      {sub != null && <div className="text-xs text-inkSoft leading-tight text-center">{sub}</div>}
    </button>
  );
}
