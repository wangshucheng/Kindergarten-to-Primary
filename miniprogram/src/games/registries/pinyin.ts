/**
 * pinyin 模块游戏注册表（含组件）。
 *
 * 仅在 pinyin 分包 page 中导入，避免主包包含 pinyin 游戏代码。
 * 元信息（id/title/icon 等）与 gameMetas.ts 保持一致。
 */
import type { ComponentType } from 'react';
import type { GameConfig, GameProps } from '../types';

import { PinyinMatchGame } from '../pinyin/PinyinMatch/PinyinMatchGame';
import { PinyinVariantsGame } from '../pinyin/PinyinVariants/PinyinVariantsGame';
import { ListenPickGame } from '../pinyin/ListenPick/ListenPickGame';

export const pinyinGames: GameConfig[] = [
  { id: 'pinyin-match', module: 'pinyin', title: '声母韵母拼读', icon: '🔡', priority: 'P0', component: PinyinMatchGame as ComponentType<GameProps> },
  { id: 'pinyin-variants', module: 'pinyin', title: '拼读变体', icon: '🎯', priority: 'P1', component: PinyinVariantsGame as ComponentType<GameProps> },
  { id: 'pinyin-listen', module: 'pinyin', title: '听音选拼音', icon: '🎧', priority: 'P1', component: ListenPickGame as ComponentType<GameProps> },
];
