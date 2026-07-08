/**
 * schemas.ts —— Zod 运行时校验模式 + 显式 TypeScript 类型。
 *
 * 所有 JSON 数据的结构在此唯一定义，替换 loader.ts 中的 `as unknown as` 强制断言。
 * 数据加载时调用 schema.parse() 进行校验，结构不匹配时抛出明确错误提示。
 *
 * 注意：使用显式 interface 定义类型（而非仅依赖 z.infer），
 * 因为 schema.default() 下 z.infer 返回 input 类型（可选字段仍可选），
 * 而 z.output 才是包含 default 填充后的实际类型。
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// 汉字词条
// ---------------------------------------------------------------------------

export const HanziEntrySchema = z.object({
  char: z.string().min(1),
  pinyin: z.string(),
  emoji: z.string(),
  meaning: z.string(),
  initial: z.string().optional(),
  final: z.string().optional(),
  tone: z.number().int().min(1).max(5).optional(),
  radical: z.string().optional(),
  strokes: z.number().int().positive().optional(),
  antonym: z.string().optional(),
  measureWord: z.string().optional(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  tags: z.array(z.string()).optional(),
});

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

/** hanzi.json 顶层结构：{ cards: HanziEntry[] } */
export const HanziBaseSchema = z.object({
  cards: z.array(HanziEntrySchema).optional().default([]),
});

/** hanzi-ext.json 顶层结构：{ chars: HanziEntry[] } */
export const HanziExtSchema = z.object({
  chars: z.array(HanziEntrySchema).optional().default([]),
});

// ---------------------------------------------------------------------------
// 英语词条
// ---------------------------------------------------------------------------

export const EnglishWordSchema = z.object({
  word: z.string().min(1),
  emoji: z.string(),
  meaning: z.string(),
  category: z.string().optional(),
  sentence: z.string().optional(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export interface EnglishWord {
  word: string;
  emoji: string;
  meaning: string;
  category?: string;
  sentence?: string;
  level?: 1 | 2 | 3;
}

export const EnglishBaseSchema = z.object({
  words: z.array(EnglishWordSchema).optional().default([]),
});

export const EnglishExtSchema = z.object({
  words: z.array(EnglishWordSchema).optional().default([]),
});

// ---------------------------------------------------------------------------
// 拼音音节
// ---------------------------------------------------------------------------

export const SyllableSchema = z.object({
  initial: z.string().optional(),
  final: z.string().optional(),
  pinyin: z.string().min(1),
  tone: z.number().int().min(1).max(5),
  char: z.string().optional(),
  emoji: z.string().optional(),
  meaning: z.string().optional(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

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

export const PinyinBaseSchema = z.object({
  initials: z.array(z.string()).optional().default([]),
  finals: z.array(z.string()).optional().default([]),
  syllables: z.array(SyllableSchema).optional().default([]),
  wholeSyllables: z.array(z.string()).optional().default([]),
});

export const PinyinFullSchema = z.object({
  initials: z.array(z.string()),
  finals: z.array(z.string()),
  wholeSyllables: z.array(z.string()),
  syllables: z.array(SyllableSchema),
});

export interface PinyinData {
  initials: string[];
  finals: string[];
  wholeSyllables: string[];
  syllables: Syllable[];
}

// ---------------------------------------------------------------------------
// 数学内容
// ---------------------------------------------------------------------------

export const AddSubtractRuleSchema = z.object({
  ops: z.array(z.enum(['+', '-'])),
  max: z.number(),
  strategies: z.array(z.string()).optional(),
  hint: z.string().optional(),
  terms: z.number().optional(),
});

export const MathContentSchema = z.object({
  addSubtract: z.record(z.string(), AddSubtractRuleSchema).optional().default({}),
  logic: z
    .object({
      sort: z.object({ types: z.array(z.string()), orders: z.array(z.string()) }),
      classify: z.object({
        dimensions: z.array(z.object({ key: z.string(), values: z.array(z.string()) })),
        examples: z.array(z.unknown()),
      }),
      pattern: z.object({ shapes: z.array(z.string()), rules: z.array(z.string()) }),
      reason: z.object({ gridSize: z.number() }),
    })
    .optional()
    .default({
      sort: { types: ['number'], orders: ['asc', 'desc'] },
      classify: {
        dimensions: [{ key: 'fly', values: ['can-fly', 'cannot-fly'] }],
        examples: [],
      },
      pattern: { shapes: ['🔵', '🔴'], rules: ['AB', 'AAB'] },
      reason: { gridSize: 2 },
    }),
});

export interface MathContent {
  addSubtract: Record<string, { ops: ('+' | '-')[]; max: number; strategies?: string[]; hint?: string; terms?: number }>;
  logic: {
    sort: { types: string[]; orders: string[] };
    classify: { dimensions: { key: string; values: string[] }[]; examples: unknown[] };
    pattern: { shapes: string[]; rules: string[] };
    reason: { gridSize: number };
  };
}

// ---------------------------------------------------------------------------
// 游戏进度存档（localStorage）
// ---------------------------------------------------------------------------

export const SAVE_VERSION = 1;

export interface GameProgressRecord {
  gameId: string;
  bestScore: number;
  stars: number;
  plays: number;
  lastPlayed: number;
  knowledgePoints: string[];
  medals: string[];
}

export const GameProgressRecordSchema = z.object({
  gameId: z.string(),
  bestScore: z.number().default(0),
  stars: z.number().int().min(0).max(3).default(0),
  plays: z.number().int().default(0),
  lastPlayed: z.number().default(0),
  knowledgePoints: z.array(z.string()).default([]),
  medals: z.array(z.string()).default([]),
});

export interface ProgressState {
  records: Record<string, GameProgressRecord>;
  unlocked: string[];
  totalStars: number;
  recent: string[];
  knowledgePoints: string[];
  medals: string[];
}

export const ProgressStateSchema = z.object({
  version: z.number().default(SAVE_VERSION),
  records: z.record(z.string(), GameProgressRecordSchema).default({}),
  unlocked: z.array(z.string()).default([]),
  totalStars: z.number().int().default(0),
  recent: z.array(z.string()).default([]),
  knowledgePoints: z.array(z.string()).default([]),
  medals: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------------------
// 成就定义 / config.json
// ---------------------------------------------------------------------------

export interface AchievementDef {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export const AchievementDefSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string(),
  description: z.string(),
});

export const ConfigSchema = z.object({
  appName: z.string().optional().default('幼升小游戏合集'),
  achievements: z.array(AchievementDefSchema).optional().default([]),
});
