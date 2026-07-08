interface ProgressBarProps {
  /** 0~100 */
  value: number;
  color?: string;
  className?: string;
}

/**
 * ProgressBar —— 圆角进度条，用于关卡进度、生命值等。
 * color 属性现在直接用于进度条背景色，不再使用 CSS 变量。
 */
export function ProgressBar({ value, color = '#95E1C9', className = '' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={['h-4 w-full rounded-full bg-white/60 overflow-hidden', className].join(' ')}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
