/**
 * hanzi 模块游戏注册表（含组件）。
 *
 * 仅在 hanzi 分包 page 中导入，避免主包包含 hanzi 游戏代码。
 * 元信息（id/title/icon 等）与 gameMetas.ts 保持一致。
 */
import type { ComponentType } from 'react';
import type { GameConfig, GameProps } from '../types';

import { FlipMemoryGame } from '../hanzi/FlipMemory/FlipMemoryGame';
import { ConnectMatchGame } from '../hanzi/ConnectMatch/ConnectMatchGame';
import { MoreHanziGame } from '../hanzi/MoreHanzi/MoreHanziGame';
import { Match3Game } from '../_shared/match3/Match3Game';
import { BrickMatchGame } from '../_shared/brick/BrickMatchGame';
import { GooseCatchGame } from '../_shared/goose/GooseCatchGame';

export const hanziGames: GameConfig[] = [
  { id: 'flip-memory', module: 'hanzi', title: '翻牌记忆', icon: '🃏', priority: 'P0', component: FlipMemoryGame as ComponentType<GameProps> },
  { id: 'connect-match', module: 'hanzi', title: '连线匹配', icon: '🔗', priority: 'P0', component: ConnectMatchGame as ComponentType<GameProps> },
  { id: 'more-hanzi', module: 'hanzi', title: '趣味识字', icon: '✏️', priority: 'P1', component: MoreHanziGame as ComponentType<GameProps> },
  { id: 'match-3', module: 'hanzi', title: '汉字消消乐', icon: '✨', priority: 'P1', component: Match3Game as ComponentType<GameProps>, subject: 'hanzi', mode: 'match-3' },
  { id: 'brick-match-hanzi', module: 'hanzi', title: '砖块配对', icon: '🧱', priority: 'P1', component: BrickMatchGame as ComponentType<GameProps>, subject: 'hanzi', mode: 'brick-match' },
  { id: 'goose-catch-hanzi', module: 'hanzi', title: '赶鹅配对', icon: '🪿', priority: 'P1', component: GooseCatchGame as ComponentType<GameProps>, subject: 'hanzi', mode: 'goose-catch' },
];
