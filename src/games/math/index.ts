import type { GameConfig } from '../types';
import { MakeTenGame } from './MakeTen/MakeTenGame';
import { MultiplicationGame } from './Multiplication/MultiplicationGame';
import { PlusMinusLinkGame } from './PlusMinusLink/PlusMinusLinkGame';
import { NumberMergeGame } from './NumberMerge/NumberMergeGame';
import { SudokuGame } from './sudoku/SudokuGame';
import { LetterSudokuGame } from './LetterSudoku/LetterSudokuGame';
import { ArithmeticSudokuGame } from './ArithmeticSudoku/ArithmeticSudokuGame';
import { NumberMinesGame } from './NumberMines/NumberMinesGame';
import { KlotskiGame } from './klotski/KlotskiGame';
import { SpeedDrillGame } from './SpeedDrill/SpeedDrillGame';
import { WordProblemGame } from './WordProblem/WordProblemGame';

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
  {
    id: 'klotski',
    module: 'math',
    title: '华容道',
    icon: '🀄',
    priority: 'P1',
    component: KlotskiGame,
    subject: 'math',
    mode: 'klotski',
  },
  { id: 'multiplication', module: 'math', title: '乘法口诀', icon: '✖️', priority: 'P1', component: MultiplicationGame },
  { id: 'mult-speed', module: 'math', title: '速算擂台', icon: '⚡', priority: 'P1', component: SpeedDrillGame },
  { id: 'mult-word', module: 'math', title: '应用题闯关', icon: '🧩', priority: 'P1', component: WordProblemGame },
];
