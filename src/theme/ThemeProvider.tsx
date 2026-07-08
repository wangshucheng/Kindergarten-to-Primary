import { createContext, useContext, type ReactNode } from 'react';
import { tokens, type ColorKey } from './tokens';

interface ThemeValue {
  /** 直接取色板颜色 */
  color: (key: ColorKey, alpha?: number) => string;
  /** 当前是否处于“减少动画”偏好（系统设置） */
  reduceMotion: boolean;
}

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * 主题提供者：为整棵组件树注入设计令牌，并在最外层设置
 * 圆体字体、奶油白背景与全局触摸友好样式。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const value: ThemeValue = {
    color: tokens.color,
    reduceMotion: Boolean(reduceMotion),
  };

  return (
    <ThemeContext.Provider value={value}>
      <div
        className="font-round min-h-screen bg-cream text-ink"
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

/** 在组件中获取主题令牌 */
export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // 兜底：未包裹 Provider 时返回默认实现，避免崩溃
    return { color: tokens.color, reduceMotion: false };
  }
  return ctx;
}
