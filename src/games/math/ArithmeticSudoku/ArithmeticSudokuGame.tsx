/**
 * 算术数独：复用标准数独核心逻辑，叠加 makeCages 生成的「笼」。
 * Board 上以虚线圆角框叠加区域并在角标显示区域和；其余交互同标准数独。
 */
import type { GameProps } from '../../types';
import { SudokuCore } from '../sudoku/SudokuGame';

/** 算术数独（mode='arithmetic'）。 */
export function ArithmeticSudokuGame(props: GameProps) {
  return <SudokuCore {...props} mode="arithmetic" gameKey="sudoku-math" />;
}

export default ArithmeticSudokuGame;
