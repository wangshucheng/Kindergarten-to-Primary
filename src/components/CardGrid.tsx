import type { ReactNode } from 'react';

interface CardGridProps {
  children: ReactNode;
  /** 列数（移动端默认 2~3） */
  cols?: number;
  className?: string;
}

/**
 * CardGrid —— 响应式卡片网格容器。
 * 用 CSS grid 实现，自动在大屏增加列数。
 */
export function CardGrid({ children, cols = 3, className = '' }: CardGridProps) {
  const colClass =
    cols <= 2
      ? 'grid-cols-2'
      : cols === 3
        ? 'grid-cols-3'
        : cols === 4
          ? 'grid-cols-3 sm:grid-cols-4'
          : 'grid-cols-4 sm:grid-cols-5';
  return (
    <div className={['grid gap-3', colClass, className].join(' ')}>{children}</div>
  );
}
