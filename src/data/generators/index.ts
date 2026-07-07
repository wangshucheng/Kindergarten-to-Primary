/**
 * QuestionGenerator —— 四学科题目生成器门面。
 * 游戏组件通过 config.subject / config.mode 选择对应子生成器。
 */
import { genHanzi } from './hanziGenerator';
import { genEnglish } from './englishGenerator';
import { genPinyin } from './pinyinGenerator';
import { genExpression, genLogic } from './mathGenerator';

export const QuestionGenerator = {
  hanzi: genHanzi,
  english: genEnglish,
  pinyin: genPinyin,
  math: genExpression,
  logic: genLogic,
};

export { genHanzi, genEnglish, genPinyin, genExpression, genLogic };
export type { HanziQuestion } from './hanziGenerator';
export type { EnglishQuestion } from './englishGenerator';
export type { PinyinQuestion } from './pinyinGenerator';
export type { MathExpr, LogicPuzzle } from './mathGenerator';
