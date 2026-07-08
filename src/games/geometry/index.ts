import type { GameConfig } from '../types';
import { GeometryGame } from './GeometryGame';

export const games: GameConfig[] = [
  {
    id: 'geometry-play',
    module: 'geometry',
    title: '图形与几何',
    icon: '📐',
    priority: 'P1',
    component: GeometryGame,
  },
];
