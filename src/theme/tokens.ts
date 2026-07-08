/**
 * 全局设计令牌（Design Tokens）
 * 所有颜色统一从这里取，避免散落的魔法字符串。
 * Tailwind 已在 tailwind.config.js 中映射同名色板（peach/mint/sky/lemon/cream）。
 */

export const palette = {
  peach: '#FFB3C6',
  mint: '#95E1C9',
  sky: '#A0D2FF',
  lemon: '#FFE066',
  cream: '#FFF9F0',
  ink: '#6B5544',
  inkSoft: '#9C8775',
  white: '#FFFFFF',
} as const;

export type ColorKey = keyof typeof palette;

/** 模块主色映射，用于在首页/模块页给不同模块上色 */
export const moduleColors: Record<string, ColorKey> = {
  math: 'peach',
  pinyin: 'mint',
  hanzi: 'sky',
  english: 'lemon',
  poetry: 'cream',
  geometry: 'sky',
};

/** 通用圆角与按压回弹参数 */
export const radii = {
  card: '1.5rem',
  pill: '9999px',
} as const;

/** 取色板颜色（带透明度支持的辅助函数） */
export function color(key: ColorKey, alpha = 1): string {
  const hex = palette[key];
  if (alpha >= 1) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const tokens = { palette, moduleColors, radii, color };
