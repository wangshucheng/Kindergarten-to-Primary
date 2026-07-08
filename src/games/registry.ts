import * as math from './math';
import * as pinyin from './pinyin';
import * as hanzi from './hanzi';
import * as english from './english';
import * as poetry from './poetry';
import * as geometry from './geometry';
import type { GameConfig, ModuleKey, ModuleMeta } from './types';

// ---------------------------------------------------------------------------
// 模块元数据（描述信息，作为模块目录的唯一真相来源）
// ---------------------------------------------------------------------------

const MODULE_META: ModuleMeta[] = [
  {
    key: 'math',
    title: '数学乐园',
    icon: '🔢',
    description: '凑十法 · 加减连连看 · 数字合成 · 数独 · 华容道',
  },
  {
    key: 'pinyin',
    title: '拼音王国',
    icon: '🔤',
    description: '声母韵母 · 拼读练习 · 听音选拼音',
  },
  {
    key: 'hanzi',
    title: '汉字天地',
    icon: '📚',
    description: '翻牌记忆 · 连线匹配 · 识字玩法 · 消消乐',
  },
  {
    key: 'english',
    title: '英语小镇',
    icon: '🔤',
    description: '字母 · 单词 · 句子 · 对战 · 砖块 · 赶鹅',
  },
  {
    key: 'poetry',
    title: '必背古诗文',
    icon: '📜',
    description: '18 首必背古诗文 · 咏鹅/村居/咏柳/望庐山瀑布…',
  },
  {
    key: 'geometry',
    title: '图形与几何',
    icon: '📐',
    description: '认图形 · 拼搭计数 · 找对称 · 角分类',
  },
];

// ---------------------------------------------------------------------------
// 游戏注册表（组件映射 + 元数据，添加游戏只需在此处修改）
// ---------------------------------------------------------------------------

export const allGames: GameConfig[] = [
  ...math.games,
  ...pinyin.games,
  ...hanzi.games,
  ...english.games,
  ...poetry.games,
  ...geometry.games,
];

export const gameMap: Record<string, GameConfig> = Object.fromEntries(
  allGames.map((g) => [g.id, g]),
);

export const moduleGames: Record<ModuleKey, GameConfig[]> = {
  math: math.games,
  pinyin: pinyin.games,
  hanzi: hanzi.games,
  english: english.games,
  poetry: poetry.games,
  geometry: geometry.games,
};

// ---------------------------------------------------------------------------
// 查询 API
// ---------------------------------------------------------------------------

/** 按 gameId 查找 GameConfig（含渲染组件） */
export function getGame(id: string | undefined): GameConfig | undefined {
  if (!id) return undefined;
  return gameMap[id];
}

/** 获取所有模块元数据（用于页面渲染导航/目录） */
export function getModules(): ModuleMeta[] {
  return MODULE_META;
}

/** 获取某模块下的游戏列表（浅拷贝，按 priority 排序：P0 优先） */
export function getModuleGames(module: ModuleKey): GameConfig[] {
  return [...(moduleGames[module] ?? [])].sort((a, b) => {
    const rank = { P0: 0, P1: 1, P2: 2 };
    return (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);
  });
}

/** 从 GameConfig[] 导出轻量目录项（id/title/icon/priority）供页面渲染 */
export function toGameEntry(g: GameConfig) {
  return {
    id: g.id,
    title: g.title,
    icon: g.icon,
    priority: g.priority,
    subject: g.subject,
    mode: g.mode,
  };
}
