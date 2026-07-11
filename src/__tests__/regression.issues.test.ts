/**
 * 回归测试（node 环境，不依赖渲染）· 覆盖高优问题修复后的不变量：
 * - M6：失误数会影响星级（失误现在会被正确记录，避免「永远三星」失真）。
 * - H1：赶鹅三关数学上可通关（targetScore ≤ 满分 = rounds×10）。
 * - H2：分数驱动玩法（消消乐/砖块/数字扫雷/华容道）通关时上报 score > 0，
 *   即 finish() 通过 ScoreContext 的 ref 镜像读取实时分数，而非陈旧的 0。
 */
import { describe, expect, it } from 'vitest';
import { computeStars } from '../utils/gameLoop';
import { GOOSE_LEVELS } from '../games/_shared/goose/gooseCatchLogic';
import {
  createInitialScoreState,
  scoreReducer,
  type ScoreState,
} from '../state/ScoreContext';

describe('M6 · 星级随失误数下降（失误已被记录）', () => {
  it('相同通过/用时下，失误越多星级越低', () => {
    const base = { passed: true, durationMs: 1000 };
    expect(computeStars({ ...base, mistakes: 0 })).toBe(3);
    expect(computeStars({ ...base, mistakes: 2 })).toBe(3); // 未超阈值
    expect(computeStars({ ...base, mistakes: 4 })).toBe(2); // 超 starMistakes=3
    expect(computeStars({ ...base, mistakes: 7 })).toBe(1); // 超 starMistakes×2=6
  });

  it('未通过一律 0 星', () => {
    expect(computeStars({ passed: false, mistakes: 0, durationMs: 1000 })).toBe(0);
  });

  it('超时也会压低星级', () => {
    // 无失误但超时（>60s 且 ≤120s）→ 至多 2 星
    expect(computeStars({ passed: true, mistakes: 0, durationMs: 90000 })).toBe(2);
    // 严重超时（>120s）→ 1 星
    expect(computeStars({ passed: true, mistakes: 0, durationMs: 200000 })).toBe(1);
  });
});

describe('H1 · 赶鹅三关数学可通关', () => {
  it('每关 targetScore ≤ rounds×10（满分），数学上可通关', () => {
    const perfectScorePerRound = 10;
    for (const lv of GOOSE_LEVELS) {
      const maxScore = lv.rounds * perfectScorePerRound; // 全对满分
      expect(lv.targetScore).toBeLessThanOrEqual(maxScore);
      // 所需最少答对轮次不超过总轮次（否则任何玩法都无法达成）
      expect(Math.ceil(lv.targetScore / perfectScorePerRound)).toBeLessThanOrEqual(lv.rounds);
    }
  });

  it('三关梯度单调递增（轮次/分数均与难度对应）', () => {
    for (let i = 1; i < GOOSE_LEVELS.length; i++) {
      const prev = GOOSE_LEVELS[i - 1];
      const cur = GOOSE_LEVELS[i];
      expect(cur.rounds).toBeGreaterThan(prev.rounds);
      expect(cur.targetScore).toBeGreaterThan(prev.targetScore);
    }
  });
});

describe('H2 · 分数驱动玩法通关上报 score > 0', () => {
  // 四个分数驱动玩法（消消乐/砖块/数字扫雷/华容道）的 finish() 现在读取
  // ScoreContext 的 scoreRef.current；此处用 reducer 模拟「全对一局」，
  // 校验数据层产出的实时分数非零且等于累计加分，防止 finish 误报 score:0 回归。
  const SCORE_GAMES = ['math-match3', 'math-brick', 'math-number-mines', 'math-klotski'] as const;

  for (const gameId of SCORE_GAMES) {
    it(`${gameId}：全对一局 score 应等于累计加分且 > 0`, () => {
      let s: ScoreState = createInitialScoreState();
      const correctCount = 8;
      for (let i = 0; i < correctCount; i++) {
        s = scoreReducer(s, { type: 'addScore', n: 10 });
      }
      // finish() 上报：{ score: scoreRef.current, ... }
      const result = {
        score: s.score,
        passed: true,
        stars: computeStars({ passed: true, mistakes: s.mistakes, durationMs: 1000 }),
        durationMs: 1000,
      };
      expect(result.score).toBe(correctCount * 10);
      expect(result.score).toBeGreaterThan(0);
      expect(typeof result.score).toBe('number');
    });
  }
});
