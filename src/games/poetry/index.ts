import type { GameConfig } from '../types';
import { lazyGame } from '../lazyGame';

const PoetryGame = lazyGame(() => import('./PoetryGame'), 'PoetryGame');

export const games: GameConfig[] = [
  {
    id: 'poetry-cards',
    module: 'poetry',
    title: '必背古诗文',
    icon: '📜',
    priority: 'P0',
    component: PoetryGame,
  },
];
