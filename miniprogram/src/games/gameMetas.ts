/**
 * 游戏元信息（不含组件）—— 主包使用，避免把游戏组件代码打包进主包。
 *
 * 设计动机：
 * - 28 个游戏组件打包后约 500KB，若主包直接 import 会导致主包臃肿
 * - 主包（pages/index, pages/module）只需要 id/title/icon/module/priority 等元信息
 *   用于展示列表和构建跳转 URL
 * - 真正的游戏组件由分包 page 在各自目录内 import，按需下载
 *
 * 与 GameConfig 的关系：
 * - GameMeta = GameConfig 去掉 component 字段
 * - 分包 page 通过 module 名匹配 GameMeta，再 import 该模块的 GameConfig[]
 */

import type { ModuleKey, Priority } from './types';

export interface GameMeta {
  id: string;
  module: ModuleKey;
  title: string;
  icon: string;
  priority: Priority;
  subject?: string;
  mode?: string;
}

/**
 * 全部游戏的元信息列表（顺序与 miniprogramRegistry 一致）。
 *
 * 维护约定：新增游戏时，先在此列表添加元信息，
 * 再在 miniprogramRegistry.ts 添加对应的组件导入与 GameConfig。
 */
export const gameMetas: GameMeta[] = [
  // pinyin
  { id: 'pinyin-match', module: 'pinyin', title: '声母韵母拼读', icon: '🔡', priority: 'P0' },
  { id: 'pinyin-variants', module: 'pinyin', title: '拼读变体', icon: '🎯', priority: 'P1' },
  { id: 'pinyin-listen', module: 'pinyin', title: '听音选拼音', icon: '🎧', priority: 'P1' },
  // hanzi
  { id: 'flip-memory', module: 'hanzi', title: '翻牌记忆', icon: '🃏', priority: 'P0' },
  { id: 'connect-match', module: 'hanzi', title: '连线匹配', icon: '🔗', priority: 'P0' },
  { id: 'more-hanzi', module: 'hanzi', title: '趣味识字', icon: '✏️', priority: 'P1' },
  { id: 'match-3', module: 'hanzi', title: '汉字消消乐', icon: '✨', priority: 'P1', subject: 'hanzi', mode: 'match-3' },
  { id: 'brick-match-hanzi', module: 'hanzi', title: '砖块配对', icon: '🧱', priority: 'P1', subject: 'hanzi', mode: 'brick-match' },
  { id: 'goose-catch-hanzi', module: 'hanzi', title: '赶鹅配对', icon: '🪿', priority: 'P1', subject: 'hanzi', mode: 'goose-catch' },
  // math
  { id: 'make-ten', module: 'math', title: '凑十法', icon: '🍎', priority: 'P0' },
  { id: 'plus-minus-link', module: 'math', title: '加减连连看', icon: '➕', priority: 'P0' },
  { id: 'number-merge', module: 'math', title: '数字合成', icon: '🔢', priority: 'P1' },
  { id: 'sudoku', module: 'math', title: '数独', icon: '🔢', priority: 'P1' },
  { id: 'sudoku-letter', module: 'math', title: '字母数独', icon: '🔠', priority: 'P1' },
  { id: 'sudoku-math', module: 'math', title: '算术数独', icon: '➕', priority: 'P1' },
  { id: 'number-mines', module: 'math', title: '数字地雷', icon: '💣', priority: 'P1', subject: 'math', mode: 'number-mines' },
  { id: 'klotski', module: 'math', title: '华容道', icon: '🧩', priority: 'P1', subject: 'math', mode: 'klotski' },
  { id: 'multiplication', module: 'math', title: '乘法口诀', icon: '✖️', priority: 'P1' },
  { id: 'mult-speed', module: 'math', title: '速算擂台', icon: '⚡', priority: 'P1' },
  { id: 'mult-word', module: 'math', title: '应用题闯关', icon: '🧩', priority: 'P1' },
  // english
  { id: 'letter-case', module: 'english', title: '大小写配对', icon: '🔠', priority: 'P0' },
  { id: 'word-image', module: 'english', title: '单词图文', icon: '🖼️', priority: 'P1' },
  { id: 'sentence-fill', module: 'english', title: '句子填空', icon: '📝', priority: 'P1' },
  { id: 'battle-quiz', module: 'english', title: '答题大作战', icon: '⚔️', priority: 'P1' },
  { id: 'match-3-en', module: 'english', title: '英语消消乐', icon: '✨', priority: 'P1', subject: 'english', mode: 'match-3' },
  { id: 'brick-match', module: 'english', title: '砖块配对', icon: '🧱', priority: 'P1', subject: 'english', mode: 'brick-match' },
  { id: 'goose-catch', module: 'english', title: '赶鹅配对', icon: '🪿', priority: 'P1', subject: 'english', mode: 'goose-catch' },
  { id: 'vocab-drill', module: 'english', title: '核心词汇', icon: '📚', priority: 'P0' },
  { id: 'category-learn', module: 'english', title: '分类学习', icon: '🏷️', priority: 'P1' },
  // poetry
  { id: 'poetry-cards', module: 'poetry', title: '必背古诗文', icon: '📜', priority: 'P0' },
  // geometry
  { id: 'geometry-play', module: 'geometry', title: '图形与几何', icon: '📐', priority: 'P1' },
];

export const gameMetaMap: Record<string, GameMeta> = Object.fromEntries(
  gameMetas.map((g) => [g.id, g]),
);

export function getGameMeta(id: string): GameMeta | undefined {
  return gameMetaMap[id];
}

/** 按模块筛选游戏元信息（按 priority 排序：P0 优先） */
export function getGameMetasByModule(module: ModuleKey): GameMeta[] {
  const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
  return gameMetas
    .filter((g) => g.module === module)
    .sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
}
