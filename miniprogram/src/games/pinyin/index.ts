import type { GameConfig } from '../types';
import { lazyGame } from '../lazyGame';

const PinyinMatchGame = lazyGame(() => import('./PinyinMatch/PinyinMatchGame'), 'PinyinMatchGame');
const PinyinVariantsGame = lazyGame(
  () => import('./PinyinVariants/PinyinVariantsGame'),
  'PinyinVariantsGame',
);
const ListenPickGame = lazyGame(() => import('./ListenPick/ListenPickGame'), 'ListenPickGame');

export const games: GameConfig[] = [
  {
    id: 'pinyin-match',
    module: 'pinyin',
    title: '声母韵母拼读',
    icon: '🔡',
    priority: 'P0',
    component: PinyinMatchGame,
  },
  {
    id: 'pinyin-variants',
    module: 'pinyin',
    title: '拼读变体',
    icon: '🎯',
    priority: 'P1',
    component: PinyinVariantsGame,
  },
  {
    id: 'pinyin-listen',
    module: 'pinyin',
    title: '听音选拼音',
    icon: '🎧',
    priority: 'P1',
    component: ListenPickGame,
  },
];
