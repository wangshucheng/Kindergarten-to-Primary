import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import type { CSSProperties, ReactNode } from 'react';
import { staggerStyle } from '../utils/motion';

type RevealAnim = 'fadeInUp' | 'scaleIn' | 'riseIn' | 'fadeIn';

interface RevealProps {
  children: ReactNode;
  /** 入场动画类型 */
  anim?: RevealAnim;
  /** 错峰序号（配合 step 生成延迟） */
  index?: number;
  /** 每项延迟步进（毫秒） */
  step?: number;
  /** 起始延迟（毫秒） */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  as?: 'div' | 'section' | 'li' | 'span';
}

const animClass: Record<RevealAnim, string> = {
  fadeInUp: 'animate-fadeInUp',
  scaleIn: 'animate-scaleIn',
  riseIn: 'animate-riseIn',
  fadeIn: 'animate-fadeIn',
};

/**
 * Reveal —— 声明式入场动画容器。
 * 通过 CSS 动画实现，尊重 reduced-motion（全局媒体查询已将动画时长归零）。
 * 支持错峰（index + step）营造列表逐个浮现的高级观感。
 */
export function Reveal({
  children,
  anim = 'fadeInUp',
  index = 0,
  step = 60,
  delay = 0,
  className = '',
  style,
  as: Tag = 'div',
}: RevealProps) {
  return (
    <Tag
      className={[animClass[anim], className].join(' ')}
      style={{ ...staggerStyle(index, step, delay), ...style }}
    >
      {children}
    </Tag>
  );
}
