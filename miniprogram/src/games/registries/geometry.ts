/**
 * geometry 模块游戏注册表（含组件）。
 *
 * 仅在 geometry 分包 page 中导入，避免主包包含 geometry 游戏代码。
 * 元信息（id/title/icon 等）与 gameMetas.ts 保持一致。
 */
import type { ComponentType } from 'react';
import type { GameConfig, GameProps } from '../types';

import { GeometryGame } from '../geometry/GeometryGame';

export const geometryGames: GameConfig[] = [
  { id: 'geometry-play', module: 'geometry', title: '图形与几何', icon: '📐', priority: 'P1', component: GeometryGame as ComponentType<GameProps> },
];
