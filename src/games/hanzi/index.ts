import type { GameConfig } from '../types';
import { FlipMemoryGame } from './FlipMemory/FlipMemoryGame';
import { ConnectMatchGame } from './ConnectMatch/ConnectMatchGame';
import { MoreHanziGame } from './MoreHanzi/MoreHanziGame';

export const games: GameConfig[] = [
  { id: 'flip-memory', module: 'hanzi', title: '翻牌记忆', icon: '🃏', priority: 'P0', component: FlipMemoryGame },
  {
    id: 'connect-match',
    module: 'hanzi',
    title: '连线匹配',
    icon: '🔗',
    priority: 'P0',
    component: ConnectMatchGame,
  },
  { id: 'more-hanzi', module: 'hanzi', title: '趣味识字', icon: '✏️', priority: 'P1', component: MoreHanziGame },
];
