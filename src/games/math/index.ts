import type { GameConfig } from '../types';
import { MakeTenGame } from './MakeTen/MakeTenGame';
import { PlusMinusLinkGame } from './PlusMinusLink/PlusMinusLinkGame';
import { NumberMergeGame } from './NumberMerge/NumberMergeGame';

export const games: GameConfig[] = [
  { id: 'make-ten', module: 'math', title: '凑十法', icon: '🍎', priority: 'P0', component: MakeTenGame },
  {
    id: 'plus-minus-link',
    module: 'math',
    title: '加减连连看',
    icon: '➕',
    priority: 'P0',
    component: PlusMinusLinkGame,
  },
  {
    id: 'number-merge',
    module: 'math',
    title: '数字合成',
    icon: '🔢',
    priority: 'P1',
    component: NumberMergeGame,
  },
];
