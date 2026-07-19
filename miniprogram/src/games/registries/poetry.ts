/**
 * poetry 模块游戏注册表（含组件）。
 *
 * 仅在 poetry 分包 page 中导入，避免主包包含 poetry 游戏代码。
 * 元信息（id/title/icon 等）与 gameMetas.ts 保持一致。
 */
import type { ComponentType } from 'react';
import type { GameConfig, GameProps } from '../types';

import { PoetryGame } from '../poetry/PoetryGame';

export const poetryGames: GameConfig[] = [
  { id: 'poetry-cards', module: 'poetry', title: '必背古诗文', icon: '📜', priority: 'P0', component: PoetryGame as ComponentType<GameProps> },
];
