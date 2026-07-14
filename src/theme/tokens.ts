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
  ink: '#5A4636',
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

/**
 * 高级渐变体系 —— 每个模块一组同色系柔和线性渐变，
 * 相比单一平涂更具景深与高级质感（用于首页/模块页大卡片）。
 */
export const moduleGradients: Record<string, string> = {
  math: 'linear-gradient(135deg, #FFC7D6 0%, #FFB3C6 45%, #FF9BB6 100%)',
  pinyin: 'linear-gradient(135deg, #B6EED8 0%, #95E1C9 45%, #74D3B4 100%)',
  hanzi: 'linear-gradient(135deg, #BFE0FF 0%, #A0D2FF 45%, #82BEFB 100%)',
  english: 'linear-gradient(135deg, #FFEC99 0%, #FFE066 45%, #FFD23D 100%)',
  poetry: 'linear-gradient(135deg, #FFF3E3 0%, #FCE9D2 45%, #F4DBBB 100%)',
  geometry: 'linear-gradient(135deg, #C7E4FF 0%, #A6C8F5 45%, #8FB8EE 100%)',
};

/** 取模块渐变（带兜底） */
export function moduleGradient(key: string): string {
  return moduleGradients[key] ?? moduleGradients.math;
}

/** 通用圆角与按压回弹参数 */
export const radii = {
  card: '1.5rem',
  pill: '9999px',
} as const;

/** 分层景深阴影（与 tailwind boxShadow 对齐，供内联样式使用） */
export const elevation = {
  sm: '0 2px 6px rgba(60, 45, 35, 0.07), 0 1px 2px rgba(60, 45, 35, 0.05)',
  soft: '0 6px 18px rgba(70, 52, 40, 0.10), 0 2px 6px rgba(70, 52, 40, 0.06)',
  lift: '0 14px 34px rgba(70, 52, 40, 0.14), 0 4px 10px rgba(70, 52, 40, 0.08)',
  float: '0 22px 50px rgba(60, 45, 35, 0.16), 0 8px 18px rgba(60, 45, 35, 0.08)',
} as const;

/** 动效曲线（与 tailwind transitionTimingFunction 对齐） */
export const easing = {
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
  soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
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

export const tokens = {
  palette,
  moduleColors,
  moduleGradients,
  moduleGradient,
  radii,
  elevation,
  easing,
  color,
};
