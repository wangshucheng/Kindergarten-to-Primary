/**
 * 题库数据契约（Batch 1 根契约）。
 *
 * 所有玩法生成器、DataLoader、sampler 共享这里的类型定义。
 * 注意：SubjectKey 在此处唯一定义，其它文件（如 src/games/types.ts）
 * 通过 `import type` 复用，避免重复声明。
 */

/** 学科键：决定题库池与生成器分发 */
export type SubjectKey = 'hanzi' | 'pinyin' | 'english' | 'math';

/** 生成器公共请求（四学科子生成器共用） */
export interface GenOpts {
  level: 1 | 2 | 3;
  mode?: string;
  count: number;
  seed?: number;
}

/** 汉字词条 */
export interface HanziEntry {
  char: string;
  pinyin: string;
  emoji: string;
  meaning: string;
  initial?: string;
  final?: string;
  tone?: number;
  radical?: string;
  strokes?: number;
  antonym?: string;
  measureWord?: string;
  level?: 1 | 2 | 3;
  tags?: string[];
}

/** 英语词条 */
export interface EnglishWord {
  word: string;
  emoji: string;
  meaning: string;
  category?: string;
  sentence?: string;
  level?: 1 | 2 | 3;
}

/** 拼音音节例字 */
export interface Syllable {
  initial?: string;
  final?: string;
  pinyin: string;
  tone: number;
  char?: string;
  emoji?: string;
  meaning?: string;
  level?: 1 | 2 | 3;
}

/** 完整拼音体系数据 */
export interface PinyinData {
  initials: string[];
  finals: string[];
  wholeSyllables: string[];
  syllables: Syllable[];
}

/** 加减法生成规则 */
export interface AddSubtractRule {
  ops: ('+' | '-')[];
  max: number;
  strategies?: string[];
  hint?: string;
  terms?: number;
}

/** 数学内容（算式 + 逻辑生成规则，均为规则而非静态题面） */
export interface MathContent {
  addSubtract: Record<string, AddSubtractRule>;
  logic: {
    sort: { types: string[]; orders: string[] };
    classify: { dimensions: { key: string; values: string[] }[]; examples: unknown[] };
    pattern: { shapes: string[]; rules: string[] };
    reason: { gridSize: number };
  };
}
