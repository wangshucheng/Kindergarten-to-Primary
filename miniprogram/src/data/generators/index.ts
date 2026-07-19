/**
 * QuestionGenerator —— 四学科题目生成器门面。
 * 游戏组件通过 config.subject / config.mode 选择对应子生成器。
 */
import { genHanzi } from './hanziGenerator';
import { genExpression, genLogic } from './mathGenerator';

export const QuestionGenerator = {
  hanzi: genHanzi,
  math: genExpression,
  logic: genLogic,
};

export { genHanzi, genExpression, genLogic };
export type { HanziQuestion } from './hanziGenerator';
export type { MathExpr, LogicPuzzle } from './mathGenerator';
