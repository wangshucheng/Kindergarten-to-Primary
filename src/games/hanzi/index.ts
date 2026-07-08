import type { GameConfig } from '../types';
import { FlipMemoryGame } from './FlipMemory/FlipMemoryGame';
import { ConnectMatchGame } from './ConnectMatch/ConnectMatchGame';
import { MoreHanziGame } from './MoreHanzi/MoreHanziGame';
import { Match3Game } from '../_shared/match3/Match3Game';
import { BrickMatchGame } from '../_shared/brick/BrickMatchGame';
import { GooseCatchGame } from '../_shared/goose/GooseCatchGame';

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
  {
    id: 'brick-match-hanzi',
    module: 'hanzi',
    title: '砖块配对',
    icon: '🧱',
    priority: 'P1',
    component: BrickMatchGame,
    subject: 'hanzi',
    mode: 'brick-match',
  },
  {
    id: 'goose-catch-hanzi',
    module: 'hanzi',
    title: '赶鹅配对',
    icon: '🪿',
    priority: 'P1',
    component: GooseCatchGame,
    subject: 'hanzi',
    mode: 'goose-catch',
  },
];
