/**
 * 第 2 批注册与集成回归（仅新增用例、不改源码）。
 * 确认：math/number-mines、hanzi/match-3、english/match-3-en 注册正确，
 * 且 ArithmeticSudoku 导入路径已还原（见 src/games/math/index.ts）。
 *
 * v2 重构：数据源改为 registry 自洽校验，不再依赖 config.json。
 */
import { describe, expect, it } from 'vitest';
import { Match3Game } from '../games/_shared/match3/Match3Game';
import { NumberMinesGame } from '../games/math/NumberMines/NumberMinesGame';
import { games as mathGames } from '../games/math/index';
import { games as hanziGames } from '../games/hanzi/index';
import { games as englishGames } from '../games/english/index';
import { getModules } from '../games/registry';
import type { PreloadableGame } from '../games/lazyGame';

/** 解析懒游戏组件到底层组件（游戏已改为按需加载） */
const resolve = (c: unknown) => (c as PreloadableGame).preload();

describe('游戏注册', () => {
  it('math 模块含 number-mines 且组件为 NumberMinesGame', async () => {
    const g = mathGames.find((x) => x.id === 'number-mines');
    expect(g).toBeDefined();
    expect(await resolve(g?.component)).toBe(NumberMinesGame);
    expect(g?.subject).toBe('math');
    expect(g?.mode).toBe('number-mines');
  });

  it('hanzi 模块含 match-3 且 subject=hanzi', async () => {
    const g = hanziGames.find((x) => x.id === 'match-3');
    expect(g).toBeDefined();
    expect(await resolve(g?.component)).toBe(Match3Game);
    expect(g?.subject).toBe('hanzi');
  });

  it('english 模块含 match-3-en 且 subject=english', async () => {
    const g = englishGames.find((x) => x.id === 'match-3-en');
    expect(g).toBeDefined();
    expect(await resolve(g?.component)).toBe(Match3Game);
    expect(g?.subject).toBe('english');
  });

  it('english 模块在 registry 中存在且含 match-3-en 游戏', () => {
    const mods = getModules();
    const en = mods.find((m) => m.key === 'english');
    expect(en).toBeDefined();
    const enGames = englishGames.filter((g) => g.module === 'english');
    expect(enGames.some((x) => x.id === 'match-3-en')).toBe(true);
  });

  it('math 模块仍含既有玩法（sudoku/make-ten 等未被破坏）', () => {
    const ids = mathGames.map((g) => g.id);
    expect(ids).toContain('make-ten');
    expect(ids).toContain('sudoku');
    expect(ids).toContain('sudoku-math');
    expect(ids).toContain('number-mines');
  });
});
