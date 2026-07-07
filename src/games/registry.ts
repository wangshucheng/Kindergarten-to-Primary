import * as math from './math';
import * as pinyin from './pinyin';
import * as hanzi from './hanzi';
import * as english from './english';
import type { GameConfig, ModuleKey } from './types';

/** 聚合四大模块的游戏注册表（组件映射在此完成，config.json 仅存目录元数据） */
export const allGames: GameConfig[] = [
  ...math.games,
  ...pinyin.games,
  ...hanzi.games,
  ...english.games,
];

export const gameMap: Record<string, GameConfig> = Object.fromEntries(
  allGames.map((g) => [g.id, g]),
);

export const moduleGames: Record<ModuleKey, GameConfig[]> = {
  math: math.games,
  pinyin: pinyin.games,
  hanzi: hanzi.games,
  english: english.games,
};

/** 按 gameId 查找 GameConfig（含渲染组件） */
export function getGame(id: string | undefined): GameConfig | undefined {
  if (!id) return undefined;
  return gameMap[id];
}
