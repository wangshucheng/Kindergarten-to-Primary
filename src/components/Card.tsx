import type { CSSProperties, ReactNode } from 'react';

export type CardTone = 'peach' | 'mint' | 'sky' | 'lemon' | 'cream' | 'white';

const toneBg: Record<CardTone, string> = {
  peach: 'bg-peach',
  mint: 'bg-mint',
  sky: 'bg-sky',
  lemon: 'bg-lemon',
  cream: 'bg-cream',
  white: 'bg-white',
};

interface CardProps {
  /** 主图（emoji 或文本） */
  emoji?: ReactNode;
  /** 主文本（如汉字、拼音、算式） */
  label?: ReactNode;
  /** 副文本（如拼音、释义） */
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
 * 大圆角、按压回弹、最小触控区，统一 Pointer 事件。
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
    ? 'opacity-40 scale-95'
    : selected
      ? 'ring-4 ring-white shadow-glow scale-105'
      : wrong
        ? 'ring-4 ring-red-300 animate-shake'
        : 'shadow-soft hover:-translate-y-0.5';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'relative flex flex-col items-center justify-center gap-1',
        'rounded-3xl font-round text-ink select-none',
        'transition-all duration-150 active:scale-95',
        'min-h-[64px] min-w-[64px] p-3',
        toneBg[tone],
        disabled ? 'cursor-default' : 'cursor-pointer',
        stateClass,
        className,
      ].join(' ')}
      style={{ touchAction: 'manipulation', userSelect: 'none', ...style }}
    >
      {emoji != null && <div className="text-3xl leading-none">{emoji}</div>}
      {label != null && (
        <div className="text-lg font-bold leading-tight text-center">{label}</div>
      )}
      {sub != null && <div className="text-xs text-inkSoft leading-tight text-center">{sub}</div>}
    </button>
  );
}

export default Card;
