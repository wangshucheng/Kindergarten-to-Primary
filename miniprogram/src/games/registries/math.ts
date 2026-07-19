/**
 * math 模块游戏注册表（含组件）。
 *
 * 仅在 math 分包 page 中导入，避免主包包含 math 游戏代码。
 * 元信息（id/title/icon 等）与 gameMetas.ts 保持一致。
 */
import type { ComponentType } from 'react';
import type { GameConfig, GameProps } from '../types';

import { MakeTenGame } from '../math/MakeTen/MakeTenGame';
import { MultiplicationGame } from '../math/Multiplication/MultiplicationGame';
import { PlusMinusLinkGame } from '../math/PlusMinusLink/PlusMinusLinkGame';
import { NumberMergeGame } from '../math/NumberMerge/NumberMergeGame';
import { SudokuGame } from '../math/sudoku/SudokuGame';
import { LetterSudokuGame } from '../math/LetterSudoku/LetterSudokuGame';
import { ArithmeticSudokuGame } from '../math/ArithmeticSudoku/ArithmeticSudokuGame';
import { NumberMinesGame } from '../math/NumberMines/NumberMinesGame';
import { KlotskiGame } from '../math/klotski/KlotskiGame';
import { SpeedDrillGame } from '../math/SpeedDrill/SpeedDrillGame';
import { WordProblemGame } from '../math/WordProblem/WordProblemGame';

export const mathGames: GameConfig[] = [
  { id: 'make-ten', module: 'math', title: '凑十法', icon: '🍎', priority: 'P0', component: MakeTenGame as ComponentType<GameProps> },
  { id: 'plus-minus-link', module: 'math', title: '加减连连看', icon: '➕', priority: 'P0', component: PlusMinusLinkGame as ComponentType<GameProps> },
  { id: 'number-merge', module: 'math', title: '数字合成', icon: '🔢', priority: 'P1', component: NumberMergeGame as ComponentType<GameProps> },
  { id: 'sudoku', module: 'math', title: '数独', icon: '🔢', priority: 'P1', component: SudokuGame as ComponentType<GameProps> },
  { id: 'sudoku-letter', module: 'math', title: '字母数独', icon: '🔠', priority: 'P1', component: LetterSudokuGame as ComponentType<GameProps> },
  { id: 'sudoku-math', module: 'math', title: '算术数独', icon: '➕', priority: 'P1', component: ArithmeticSudokuGame as ComponentType<GameProps> },
  { id: 'number-mines', module: 'math', title: '数字地雷', icon: '💣', priority: 'P1', component: NumberMinesGame as ComponentType<GameProps>, subject: 'math', mode: 'number-mines' },
  { id: 'klotski', module: 'math', title: '华容道', icon: '🧩', priority: 'P1', component: KlotskiGame as ComponentType<GameProps>, subject: 'math', mode: 'klotski' },
  { id: 'multiplication', module: 'math', title: '乘法口诀', icon: '✖️', priority: 'P1', component: MultiplicationGame as ComponentType<GameProps> },
  { id: 'mult-speed', module: 'math', title: '速算擂台', icon: '⚡', priority: 'P1', component: SpeedDrillGame as ComponentType<GameProps> },
  { id: 'mult-word', module: 'math', title: '应用题闯关', icon: '🧩', priority: 'P1', component: WordProblemGame as ComponentType<GameProps> },
];
