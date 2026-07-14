import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { GameProps } from './types';

/** 带预取能力的懒游戏组件 */
export interface PreloadableGame
  extends LazyExoticComponent<ComponentType<GameProps>> {
  /**
   * 预取该游戏的代码 chunk（返回底层组件）。
   * 可在用户「悬停/按下」游戏卡片时提前调用，进入游戏页时几乎无等待。
   */
  preload: () => Promise<ComponentType<GameProps>>;
}

/**
 * lazyGame —— 将「命名导出」的游戏组件包装为按需加载的懒组件。
 *
 * 用法：
 *   const MakeTenGame = lazyGame(() => import('./MakeTen/MakeTenGame'), 'MakeTenGame');
 *
 * 每个游戏因此被 Vite 拆成独立 chunk，仅在进入该游戏页时下载，
 * 首屏与列表页不再打包全部玩法代码。渲染方需处于 <Suspense> 边界内
 * （GameShell 已在游戏区包裹 Suspense）。返回值附带 preload() 以支持预取。
 */
export function lazyGame<M extends Record<string, unknown>>(
  loader: () => Promise<M>,
  exportName: keyof M & string,
): PreloadableGame {
  const load = async () => {
    const mod = await loader();
    return { default: mod[exportName] as ComponentType<GameProps> };
  };
  const Comp = lazy(load) as PreloadableGame;
  Comp.preload = () => load().then((m) => m.default);
  return Comp;
}
