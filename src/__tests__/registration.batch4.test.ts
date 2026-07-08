/**
 * 第 4 批注册与集成回归（B4 抓大鹅）。
 * 确认：english/goose-catch、hanzi/goose-catch-hanzi 注册正确，
 * 且 config.json 菜单条目与 registry id 自洽。
 */
import { describe, expect, it } from 'vitest';
import { getGame, allGames } from '../games/registry';
import { GooseCatchGame } from '../games/_shared/goose/GooseCatchGame';
import { games as hanziGames } from '../games/hanzi/index';
import { games as englishGames } from '../games/english/index';
import config from '../data/config.json';

describe('B4 游戏注册', () => {
  it('english 模块含 goose-catch 且 subject=english、组件=GooseCatchGame', () => {
    const g = getGame('goose-catch');
    expect(g).toBeDefined();
    expect(g?.module).toBe('english');
    expect(g?.subject).toBe('english');
    expect(g?.mode).toBe('goose-catch');
    expect(g?.component).toBe(GooseCatchGame);
  });

  it('hanzi 模块含 goose-catch-hanzi 且 subject=hanzi、组件=GooseCatchGame', () => {
    const g = getGame('goose-catch-hanzi');
    expect(g).toBeDefined();
    expect(g?.module).toBe('hanzi');
    expect(g?.subject).toBe('hanzi');
    expect(g?.mode).toBe('goose-catch');
    expect(g?.component).toBe(GooseCatchGame);
  });

  it('allGames 包含 goose-catch 和 goose-catch-hanzi，且 id 全局唯一', () => {
    const ids = allGames.map((g) => g.id);
    expect(ids).toContain('goose-catch');
    expect(ids).toContain('goose-catch-hanzi');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('config.json 菜单条目与 registry id 自洽', () => {
    const en = config.modules.find((m) => m.key === 'english');
    const hz = config.modules.find((m) => m.key === 'hanzi');
    expect(en?.games.some((x) => x.id === 'goose-catch')).toBe(true);
    expect(hz?.games.some((x) => x.id === 'goose-catch-hanzi')).toBe(true);
  });

  it('两大模块索引均含对应新游戏（与 registry 指向同一组件）', () => {
    expect(englishGames.find((g) => g.id === 'goose-catch')?.component).toBe(GooseCatchGame);
    expect(hanziGames.find((g) => g.id === 'goose-catch-hanzi')?.component).toBe(GooseCatchGame);
  });
});
