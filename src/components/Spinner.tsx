interface SpinnerProps {
  size?: number;
  /** 说明文字，同时用于无障碍 */
  label?: string;
  className?: string;
}

/**
 * Spinner —— 精致环形加载指示器（渐变描边 + 柔和旋转）。
 * 用于游戏懒加载、异步操作等待场景。
 */
export function Spinner({ size = 40, label = '加载中', className = '' }: SpinnerProps) {
  return (
    <div
      className={['inline-flex flex-col items-center gap-3', className].join(' ')}
      role="status"
      aria-live="polite"
    >
      <span
        className="relative inline-block animate-spinSlow"
        style={{ width: size, height: size }}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, rgba(255,179,198,0) 0deg, #FFB3C6 120deg, #A0D2FF 240deg, rgba(160,210,255,0) 360deg)',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0)',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0)',
          }}
        />
      </span>
      {label && <span className="text-sm text-inkSoft font-medium">{label}</span>}
    </div>
  );
}

/**
 * FullScreenLoader —— 居中全屏加载态，路由/游戏懒加载 Suspense 回退用。
 */
export function FullScreenLoader({ label = '正在准备…' }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center animate-fadeIn">
      <Spinner size={48} label={label} />
    </div>
  );
}
