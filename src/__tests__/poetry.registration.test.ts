import { describe, it, expect } from 'vitest';
import {
  getModules,
  getModuleGames,
  gameMap,
  allGames,
} from '../games/registry';
import { moduleColors } from '../theme/tokens';
import { PoetryGame } from '../games/poetry/PoetryGame';
import { poems } from '../games/poetry/poems';
import type { PreloadableGame } from '../games/lazyGame';

/** 解析懒游戏组件到底层组件（游戏已改为按需加载） */
const resolve = (c: unknown) => (c as PreloadableGame).preload();

describe('poetry 模块注册链路', () => {
  it('getModules() 含 key=poetry 且 title/icon 正确', () => {
    const m = getModules().find((x) => x.key === 'poetry');
    expect(m).toBeDefined();
    expect(m!.title).toBe('必背古诗文');
    expect(m!.icon).toBe('📜');
  });

  it('getModuleGames(poetry) 返回单游戏且字段正确', async () => {
    const games = getModuleGames('poetry');
    expect(games).toHaveLength(1);
    expect(games[0].id).toBe('poetry-cards');
    expect(await resolve(games[0].component)).toBe(PoetryGame);
    expect(games[0].module).toBe('poetry');
  });

  it('gameMap[poetry-cards] 存在', async () => {
    expect(gameMap['poetry-cards']).toBeDefined();
    expect(await resolve(gameMap['poetry-cards'].component)).toBe(PoetryGame);
  });

  it('moduleColors[poetry] === cream', () => {
    expect(moduleColors['poetry']).toBe('cream');
  });

  it('allGames 包含 poetry-cards', () => {
    expect(allGames.some((g) => g.id === 'poetry-cards')).toBe(true);
  });
});

describe('poems 数据完整性', () => {
  it('共 18 首，id 唯一，lines 非空且 text/pinyin 行数一致', () => {
    expect(poems).toHaveLength(18);
    const ids = poems.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of poems) {
      expect(p.lines.length).toBeGreaterThan(0);
      for (const l of p.lines) {
        expect(l.text.length).toBeGreaterThan(0);
        expect(l.pinyin.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
