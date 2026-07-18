import { useCallback, useEffect, useState, type PointerEvent } from 'react';

/**
 * 动效工具集 —— 统一管理微交互，并全程尊重系统「减少动态效果」偏好。
 *
 * 平台兼容：
 * - Web 端：使用 matchMedia 检测 prefers-reduced-motion，createRipple 注入 DOM span
 * - 小程序端：matchMedia 和 document 均不可用，createRipple 自动降级为 no-op
 *   （小程序 button 组件自带点击反馈，无需 JS 涟漪）
 */

/**
 * 监听系统 prefers-reduced-motion，返回是否应减少动画。
 * 小程序环境不支持 matchMedia，默认返回 false（不禁用动画）。
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}

/**
 * 生成错峰入场的 inline style（配合 tailwind animate-fadeInUp / riseIn 等）。
 * @param index 元素序号
 * @param step  每个元素的延迟步进（毫秒）
 * @param base  起始延迟（毫秒）
 */
export function staggerStyle(index: number, step = 60, base = 0) {
  return { animationDelay: `${base + index * step}ms` } as const;
}

/**
 * 点击涟漪：在目标元素内注入一个自清理的水波 span。
 *
 * Web 端：通过 document.createElement 创建涟漪 span，800ms 后自动移除。
 * 小程序端：无 DOM，直接 no-op（小程序 button 自带 :active 点击反馈）。
 *
 * 用法：<button onPointerDown={ripple}> …（元素需 position:relative & overflow:hidden）
 */
export function createRipple(e: PointerEvent<HTMLElement>): void {
  // 小程序环境或无 DOM 环境：直接返回
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return;
  }
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }
  const el = e.currentTarget;
  if (!el || typeof el.getBoundingClientRect !== 'function') return;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const span = document.createElement('span');
  span.className = 'ripple-ink';
  span.style.width = span.style.height = `${size}px`;
  span.style.left = `${e.clientX - rect.left - size / 2}px`;
  span.style.top = `${e.clientY - rect.top - size / 2}px`;
  el.appendChild(span);
  span.addEventListener('animationend', () => span.remove(), { once: true });
  // 兜底清理，防止极端情况下未触发 animationend
  window.setTimeout(() => span.remove(), 800);
}

/** 便捷 hook：返回稳定的涟漪处理器 */
export function useRipple() {
  return useCallback((e: PointerEvent<HTMLElement>) => createRipple(e), []);
}
