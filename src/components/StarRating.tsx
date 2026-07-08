import { palette } from '../theme/tokens';

interface StarRatingProps {
  /** 已点亮星数 0~max */
  value: number;
  max?: number;
  size?: number;
}

/**
 * StarRating —— 星级展示（结算/成就）。
 */
export function StarRating({ value, max = 3, size = 36 }: StarRatingProps) {
  return (
    <div className="flex items-center justify-center gap-1" aria-label={`${value} / ${max} 星`}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < value;
        return (
          <span
            key={i}
            className="leading-none transition-transform"
            style={{
              fontSize: size,
              color: filled ? palette.lemon : '#E7DDD0',
              textShadow: filled ? '0 2px 6px rgba(255,200,80,0.5)' : 'none',
              transform: filled ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}
