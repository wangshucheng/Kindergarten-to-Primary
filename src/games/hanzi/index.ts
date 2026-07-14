import type { GameConfig } from '../types';
import { lazyGame } from '../lazyGame';

const FlipMemoryGame = lazyGame(() => import('./FlipMemory/FlipMemoryGame'), 'FlipMemoryGame');
const ConnectMatchGame = lazyGame(
  () => import('./ConnectMatch/ConnectMatchGame'),
  'ConnectMatchGame',
);
const MoreHanziGame = lazyGame(() => import('./MoreHanzi/MoreHanziGame'), 'MoreHanziGame');
const Match3Game = lazyGame(() => import('../_shared/match3/Match3Game'), 'Match3Game');
const BrickMatchGame = lazyGame(() => import('../_shared/brick/BrickMatchGame'), 'BrickMatchGame');
const GooseCatchGame = lazyGame(() => import('../_shared/goose/GooseCatchGame'), 'GooseCatchGame');

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
