/**
 * 数独玩法共享类型定义。
 */

/** 棋盘尺寸：6×6 或 9×9。 */
export type SudokuSize = 6 | 9;

/** 单个格子：value 为填入数字（null 表示空），given 表示该格是否预填（不可改）。 */
export interface Cell {
  value: number | null;
  given: boolean;
}

/** 棋盘：size×size 的格子矩阵。 */
export type Board = Cell[][];

/** 算术数独的「笼」：一组连续格子及其目标数字和。 */
export interface Cage {
  id: number;
  cells: Array<[number, number]>;
  sum: number;
}

/** 不同尺寸下「宫」的行列划分。 */
export const BOX: Record<SudokuSize, { rows: number; cols: number }> = {
  6: { rows: 2, cols: 3 },
  9: { rows: 3, cols: 3 },
};

/** 三种数独玩法模式。 */
export type SudokuMode = 'standard' | 'letter' | 'arithmetic';
