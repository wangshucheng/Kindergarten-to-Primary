import type { ColorKey } from '../theme/tokens';

interface ProgressBarProps {
  /** 0~100 */
  value: number;
  color?: ColorKey;
  className?: string;
}

/**
 * ProgressBar —— 圆角进度条，用于关卡进度、生命值等。
 */
export function ProgressBar({ value, color = 'mint', className = '' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={['h-4 w-full rounded-full bg-white/60 overflow-hidden', className].join(' ')}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: `var(--bar, #95E1C9)` }}
        data-color={color}
      />
    </div>
  );
}

export default ProgressBar;
