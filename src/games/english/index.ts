import type { GameConfig } from '../types';
import { LetterCaseGame } from './LetterCase/LetterCaseGame';
import { WordImageGame } from './WordImage/WordImageGame';
import { SentenceFillGame } from './SentenceFill/SentenceFillGame';
import { BattleQuizGame } from './BattleQuiz/BattleQuizGame';

export const games: GameConfig[] = [
  {
    id: 'letter-case',
    module: 'english',
    title: '大小写配对',
    icon: '🔠',
    priority: 'P0',
    component: LetterCaseGame,
  },
  { id: 'word-image', module: 'english', title: '单词图文', icon: '🖼️', priority: 'P1', component: WordImageGame },
  {
    id: 'sentence-fill',
    module: 'english',
    title: '句子填空',
    icon: '📝',
    priority: 'P1',
    component: SentenceFillGame,
  },
  {
    id: 'battle-quiz',
    module: 'english',
    title: '答题大作战',
    icon: '⚔️',
    priority: 'P1',
    component: BattleQuizGame,
  },
];
