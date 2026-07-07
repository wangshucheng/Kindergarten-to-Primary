import type { GameConfig } from '../types';
import { MakeTenGame } from './MakeTen/MakeTenGame';
import { PlusMinusLinkGame } from './PlusMinusLink/PlusMinusLinkGame';
import { NumberMergeGame } from './NumberMerge/NumberMergeGame';
import { SudokuGame } from './sudoku/SudokuGame';
import { LetterSudokuGame } from './LetterSudoku/LetterSudokuGame';
import { ArithmeticSudokuGame } from './ArithmeticSudoku/ArithmeticSudokuGame';
import { NumberMinesGame } from './NumberMines/NumberMinesGame';

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
  { id: 'sudoku', module: 'math', title: '数独', icon: '🔢', priority: 'P1', component: SudokuGame },
  {
    id: 'sudoku-letter',
    module: 'math',
    title: '字母数独',
    icon: '🔠',
    priority: 'P1',
    component: LetterSudokuGame,
  },
  {
    id: 'sudoku-math',
    module: 'math',
    title: '算术数独',
    icon: '➕',
    priority: 'P1',
    component: ArithmeticSudokuGame,
  },
  {
    id: 'number-mines',
    module: 'math',
    title: '数字地雷',
    icon: '💣',
    priority: 'P1',
    component: NumberMinesGame,
    subject: 'math',
    mode: 'number-mines',
  },
];
