/**
 * 第 2 批注册与集成回归（仅新增用例、不改源码）。
 * 确认：math/number-mines、hanzi/match-3、english/match-3-en 注册正确，
 * 且 ArithmeticSudoku 导入路径已还原（见 src/games/math/index.ts）。
 */
import { describe, expect, it } from 'vitest';
import { Match3Game } from '../games/_shared/match3/Match3Game';
import { NumberMinesGame } from '../games/math/NumberMines/NumberMinesGame';
import { games as mathGames } from '../games/math/index';
import { games as hanziGames } from '../games/hanzi/index';
import { games as englishGames } from '../games/english/index';
// 配置数据自洽：english 模块含 match-3-en 条目
import config from '../data/config.json';

describe('游戏注册', () => {
  it('math 模块含 number-mines 且组件为 NumberMinesGame', () => {
    const g = mathGames.find((x) => x.id === 'number-mines');
    expect(g).toBeDefined();
    expect(g?.component).toBe(NumberMinesGame);
    expect(g?.subject).toBe('math');
    expect(g?.mode).toBe('number-mines');
  });

  it('hanzi 模块含 match-3 且 subject=hanzi', () => {
    const g = hanziGames.find((x) => x.id === 'match-3');
    expect(g).toBeDefined();
    expect(g?.component).toBe(Match3Game);
    expect(g?.subject).toBe('hanzi');
  });

  it('english 模块含 match-3-en 且 subject=english', () => {
    const g = englishGames.find((x) => x.id === 'match-3-en');
    expect(g).toBeDefined();
    expect(g?.component).toBe(Match3Game);
    expect(g?.subject).toBe('english');
  });

  it('config.json 的 english 模块包含 match-3-en 条目', () => {
    const en = config.modules.find((m) => m.key === 'english');
    expect(en).toBeDefined();
    expect(en?.games.some((x) => x.id === 'match-3-en')).toBe(true);
  });

  it('math 模块仍含既有玩法（sudoku/make-ten 等未被破坏）', () => {
    const ids = mathGames.map((g) => g.id);
    expect(ids).toContain('make-ten');
    expect(ids).toContain('sudoku');
    expect(ids).toContain('sudoku-math');
    expect(ids).toContain('number-mines');
  });
});
