/**
 * 指针事件抽象层 —— 统一 Web PointerEvents 与小程序 touch 事件。
 *
 * Web 端：使用 pointerdown/pointermove/pointerup（含全局 window 监听）
 * 小程序端：Taro 会将 onTouchStart/onTouchMove/onTouchEnd 自动映射为
 *   bindtouchstart/bindtouchmove/bindtouchend，全局监听需改为组件级绑定
 *
 * 当前阶段（Vite Web 项目）：直接透传 PointerEvent
 * 迁移到 Taro 时：替换为 TouchEvent 适配
 */

/**
 * 是否支持全局事件监听（window.addEventListener）。
 * 小程序环境无 window，需改为组件级 touch 事件绑定。
 */
export const supportsGlobalPointer: boolean =
  typeof window !== 'undefined' && typeof window.addEventListener === 'function';

/**
 * 从事件中提取坐标。
 * Web PointerEvent 直接用 clientX/clientY；
 * 小程序 TouchEvent 用 touches[0].clientX/clientY。
 */
export function getEventCoords(e: { clientX?: number; clientY?: number; touches?: Array<{ clientX: number; clientY: number }> }): { x: number; y: number } {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX ?? 0, y: e.clientY ?? 0 };
}
