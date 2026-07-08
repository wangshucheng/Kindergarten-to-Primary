/**
 * 第 3 批注册与集成回归（B3-1 砖了个砖 / B3-2 华容道）。
 * 确认：english/brick-match、hanzi/brick-match-hanzi、math/klotski 注册正确。
 *
 * v2 重构：registry 为唯一真相来源，测试直接校验 registry 自洽。
 */
import { describe, expect, it } from 'vitest';
import { getGame, allGames } from '../games/registry';
import { BrickMatchGame } from '../games/_shared/brick/BrickMatchGame';
import { KlotskiGame } from '../games/math/klotski/KlotskiGame';
import { games as mathGames } from '../games/math/index';
import { games as hanziGames } from '../games/hanzi/index';
import { games as englishGames } from '../games/english/index';

describe('B3 游戏注册', () => {
  it('english 模块含 brick-match 且 subject=english、组件=BrickMatchGame', () => {
    const g = getGame('brick-match');
    expect(g).toBeDefined();
    expect(g?.module).toBe('english');
    expect(g?.subject).toBe('english');
    expect(g?.mode).toBe('brick-match');
    expect(g?.component).toBe(BrickMatchGame);
  });

  it('hanzi 模块含 brick-match-hanzi 且 subject=hanzi、组件=BrickMatchGame', () => {
    const g = getGame('brick-match-hanzi');
    expect(g).toBeDefined();
    expect(g?.module).toBe('hanzi');
    expect(g?.subject).toBe('hanzi');
    expect(g?.mode).toBe('brick-match');
    expect(g?.component).toBe(BrickMatchGame);
  });

  it('math 模块含 klotski 且 subject=math、组件=KlotskiGame', () => {
    const g = getGame('klotski');
    expect(g).toBeDefined();
    expect(g?.module).toBe('math');
    expect(g?.subject).toBe('math');
    expect(g?.mode).toBe('klotski');
    expect(g?.component).toBe(KlotskiGame);
  });

  it('allGames 包含这 3 个 id，且 id 全局唯一', () => {
    const ids = allGames.map((g) => g.id);
    expect(ids).toContain('brick-match');
    expect(ids).toContain('brick-match-hanzi');
    expect(ids).toContain('klotski');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('registry 模块游戏列表与 id 自洽', () => {
    const allIds = new Set(allGames.map((g) => g.id));
    expect(allIds.has('brick-match')).toBe(true);
    expect(allIds.has('brick-match-hanzi')).toBe(true);
    expect(allIds.has('klotski')).toBe(true);
  });

  it('三大模块索引均含对应新游戏（与 registry 指向同一组件）', () => {
    expect(englishGames.find((g) => g.id === 'brick-match')?.component).toBe(BrickMatchGame);
    expect(hanziGames.find((g) => g.id === 'brick-match-hanzi')?.component).toBe(BrickMatchGame);
    expect(mathGames.find((g) => g.id === 'klotski')?.component).toBe(KlotskiGame);
  });
});
