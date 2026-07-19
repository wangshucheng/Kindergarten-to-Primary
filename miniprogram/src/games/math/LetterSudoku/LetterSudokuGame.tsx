/**
 * 字母数独：复用标准数独核心逻辑，letterMode=true。
 * 候选面板与棋盘均以字母（A..）显示，规则朗读提示选「字母」。
 */
import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import type { GameProps } from '../../types';
import { SudokuCore } from '../sudoku/SudokuGame';

/** 字母数独（mode='letter'）。 */
export function LetterSudokuGame(props: GameProps) {
  return <SudokuCore {...props} mode="letter" gameKey="sudoku-letter" />;
}

export default LetterSudokuGame;
