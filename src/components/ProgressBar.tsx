interface ProgressBarProps {
  /** 0~100 */
  value: number;
  color?: string;
  className?: string;
  /** 是否显示流动微光（默认开启） */
  shimmer?: boolean;
}

/**
 * ProgressBar —— 圆角进度条，用于关卡进度、生命值等。
 * 高级化：内凹轨道 + 渐变填充 + 顶部高光 + 可选流动微光，宽度过渡更顺滑。
 */
export function ProgressBar({
  value,
  color = '#95E1C9',
  className = '',
  shimmer = true,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={['relative h-4 w-full rounded-full overflow-hidden', className].join(' ')}
      style={{
        background: 'rgba(90,70,54,0.10)',
        boxShadow: 'inset 0 1px 3px rgba(60,45,35,0.16)',
      }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="relative h-full rounded-full transition-[width] duration-500 ease-smooth"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
        }}
      >
        {shimmer && pct > 0 && pct < 100 && (
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.55) 50%, transparent 80%)',
              backgroundSize: '200% 100%',
              animation: 'skeletonSlide 1.6s ease-in-out infinite',
            }}
          />
        )}
      </div>
    </div>
  );
}
