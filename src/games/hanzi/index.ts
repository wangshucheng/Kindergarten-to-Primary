import type { GameConfig } from '../types';
import { FlipMemoryGame } from './FlipMemory/FlipMemoryGame';
import { ConnectMatchGame } from './ConnectMatch/ConnectMatchGame';
import { MoreHanziGame } from './MoreHanzi/MoreHanziGame';
import { Match3Game } from '../_shared/match3/Match3Game';

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
  {
    id: 'match-3',
    module: 'hanzi',
    title: '汉字消消乐',
    icon: '🌈',
    priority: 'P1',
    component: Match3Game,
    subject: 'hanzi',
    mode: 'match-3',
  },
];
