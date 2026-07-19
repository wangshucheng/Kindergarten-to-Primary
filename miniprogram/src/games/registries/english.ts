/**
 * english 模块游戏注册表（含组件）。
 *
 * 仅在 english 分包 page 中导入，避免主包包含 english 游戏代码。
 * 元信息（id/title/icon 等）与 gameMetas.ts 保持一致。
 */
import type { ComponentType } from 'react';
import type { GameConfig, GameProps } from '../types';

import { LetterCaseGame } from '../english/LetterCase/LetterCaseGame';
import { WordImageGame } from '../english/WordImage/WordImageGame';
import { SentenceFillGame } from '../english/SentenceFill/SentenceFillGame';
import { BattleQuizGame } from '../english/BattleQuiz/BattleQuizGame';
import { Match3Game } from '../_shared/match3/Match3Game';
import { BrickMatchGame } from '../_shared/brick/BrickMatchGame';
import { GooseCatchGame } from '../_shared/goose/GooseCatchGame';
import { VocabDrillGame } from '../english/VocabDrill/VocabDrillGame';
import { CategoryLearnGame } from '../english/CategoryLearn/CategoryLearnGame';

export const englishGames: GameConfig[] = [
  { id: 'letter-case', module: 'english', title: '大小写配对', icon: '🔠', priority: 'P0', component: LetterCaseGame as ComponentType<GameProps> },
  { id: 'word-image', module: 'english', title: '单词图文', icon: '🖼️', priority: 'P1', component: WordImageGame as ComponentType<GameProps> },
  { id: 'sentence-fill', module: 'english', title: '句子填空', icon: '📝', priority: 'P1', component: SentenceFillGame as ComponentType<GameProps> },
  { id: 'battle-quiz', module: 'english', title: '答题大作战', icon: '⚔️', priority: 'P1', component: BattleQuizGame as ComponentType<GameProps> },
  { id: 'match-3-en', module: 'english', title: '英语消消乐', icon: '✨', priority: 'P1', component: Match3Game as ComponentType<GameProps>, subject: 'english', mode: 'match-3' },
  { id: 'brick-match', module: 'english', title: '砖块配对', icon: '🧱', priority: 'P1', component: BrickMatchGame as ComponentType<GameProps>, subject: 'english', mode: 'brick-match' },
  { id: 'goose-catch', module: 'english', title: '赶鹅配对', icon: '🪿', priority: 'P1', component: GooseCatchGame as ComponentType<GameProps>, subject: 'english', mode: 'goose-catch' },
  { id: 'vocab-drill', module: 'english', title: '核心词汇', icon: '📚', priority: 'P0', component: VocabDrillGame as ComponentType<GameProps> },
  { id: 'category-learn', module: 'english', title: '分类学习', icon: '🏷️', priority: 'P1', component: CategoryLearnGame as ComponentType<GameProps> },
];
