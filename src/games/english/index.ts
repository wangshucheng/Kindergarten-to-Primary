import type { GameConfig } from '../types';
import { lazyGame } from '../lazyGame';

const LetterCaseGame = lazyGame(() => import('./LetterCase/LetterCaseGame'), 'LetterCaseGame');
const WordImageGame = lazyGame(() => import('./WordImage/WordImageGame'), 'WordImageGame');
const SentenceFillGame = lazyGame(
  () => import('./SentenceFill/SentenceFillGame'),
  'SentenceFillGame',
);
const BattleQuizGame = lazyGame(() => import('./BattleQuiz/BattleQuizGame'), 'BattleQuizGame');
const Match3Game = lazyGame(() => import('../_shared/match3/Match3Game'), 'Match3Game');
const BrickMatchGame = lazyGame(() => import('../_shared/brick/BrickMatchGame'), 'BrickMatchGame');
const GooseCatchGame = lazyGame(() => import('../_shared/goose/GooseCatchGame'), 'GooseCatchGame');
const VocabDrillGame = lazyGame(() => import('./VocabDrill/VocabDrillGame'), 'VocabDrillGame');
const CategoryLearnGame = lazyGame(
  () => import('./CategoryLearn/CategoryLearnGame'),
  'CategoryLearnGame',
);
const LetterFlashGame = lazyGame(
  () => import('./LetterFlash/LetterFlashGame'),
  'LetterFlashGame',
);
const TreasureHuntGame = lazyGame(
  () => import('./TreasureHunt/TreasureHuntGame'),
  'TreasureHuntGame',
);

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
  {
    id: 'match-3-en',
    module: 'english',
    title: '英语消消乐',
    icon: '✨',
    priority: 'P1',
    component: Match3Game,
    subject: 'english',
    mode: 'match-3',
  },
  {
    id: 'brick-match',
    module: 'english',
    title: '砖块配对',
    icon: '🧱',
    priority: 'P1',
    component: BrickMatchGame,
    subject: 'english',
    mode: 'brick-match',
  },
  {
    id: 'goose-catch',
    module: 'english',
    title: '赶鹅配对',
    icon: '🪿',
    priority: 'P1',
    component: GooseCatchGame,
    subject: 'english',
    mode: 'goose-catch',
  },
  {
    id: 'vocab-drill',
    module: 'english',
    title: '核心词汇',
    icon: '📚',
    priority: 'P0',
    component: VocabDrillGame,
  },
  {
    id: 'category-learn',
    module: 'english',
    title: '分类学习',
    icon: '🏷️',
    priority: 'P1',
    component: CategoryLearnGame,
  },
  {
    id: 'letter-flash',
    module: 'english',
    title: '字母音闪电卡',
    icon: '⚡',
    priority: 'P0',
    component: LetterFlashGame,
  },
  {
    id: 'treasure-hunt',
    module: 'english',
    title: '主题寻宝',
    icon: '🗺️',
    priority: 'P0',
    component: TreasureHuntGame,
  },
];
