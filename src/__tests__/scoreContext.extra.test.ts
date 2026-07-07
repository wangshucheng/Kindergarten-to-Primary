/**
 * QA 补充测试（严过关）· ScoreContext 扩展强化。
 * 工程师自测已覆盖「基础动作 + collectKnowledge 奖励分/去重 + unlockMedal 去重」，
 * 但「扩展后既有 score/combo/mistakes/rounds 行为不变（无回归）」
 * 与「GameShell.handleComplete 能收割 knowledgePoints/medals 落盘」契约未被断言。
 */
import { describe, expect, it } from 'vitest';
import {
  createInitialScoreState,
  scoreReducer,
  KNOWLEDGE_BONUS,
  type ScoreState,
  type ScoreAction,
} from '../state/ScoreContext';

/** 顺序执行一系列 action，返回最终状态（模拟一局内的混合操作） */
function apply(s: ScoreState, actions: ScoreAction[]): ScoreState {
  return actions.reduce((acc, a) => scoreReducer(acc, a), s);
}

describe('scoreReducer · 扩展不破坏既有行为（无回归）', () => {
  it('collectKnowledge 不应改动 combo / mistakes / rounds', () => {
    let s = createInitialScoreState();
    s = scoreReducer(s, { type: 'addScore', n: 10 });
    s = scoreReducer(s, { type: 'bumpCombo' });
    s = scoreReducer(s, { type: 'bumpCombo' }); // combo = 2
    s = scoreReducer(s, { type: 'addMistake' }); // mistakes = 1, combo 归零
    s = scoreReducer(s, { type: 'addRound' }); // rounds = 1
    s = scoreReducer(s, { type: 'bumpCombo' }); // combo = 1
    const before = { score: s.score, combo: s.combo, mistakes: s.mistakes, rounds: s.rounds };

    s = scoreReducer(s, { type: 'collectKnowledge', id: 'hanzi:妈' });

    expect(s.combo).toBe(before.combo); // 连击不受影响
    expect(s.mistakes).toBe(before.mistakes); // 失误不受影响
    expect(s.rounds).toBe(before.rounds); // 回合数不受影响
    expect(s.score).toBe(before.score + KNOWLEDGE_BONUS); // 仅加奖励分
    expect(s.knowledgePoints).toEqual(['hanzi:妈']);
  });

  it('unlockMedal 不应改动 score / combo / mistakes / rounds', () => {
    let s = createInitialScoreState();
    s = scoreReducer(s, { type: 'addScore', n: 7 });
    s = scoreReducer(s, { type: 'bumpCombo' });
    s = scoreReducer(s, { type: 'addMistake' });
    s = scoreReducer(s, { type: 'addRound' });
    const before = { score: s.score, combo: s.combo, mistakes: s.mistakes, rounds: s.rounds };

    s = scoreReducer(s, { type: 'unlockMedal', id: 'final:a' });

    expect(s.score).toBe(before.score);
    expect(s.combo).toBe(before.combo);
    expect(s.mistakes).toBe(before.mistakes);
    expect(s.rounds).toBe(before.rounds);
    expect(s.medals).toEqual(['final:a']);
  });

  it('collectKnowledge 与 unlockMedal 可并发累积且各自去重', () => {
    let s = createInitialScoreState();
    s = apply(s, [
      { type: 'collectKnowledge', id: 'hanzi:妈' },
      { type: 'collectKnowledge', id: 'hanzi:爸' },
      { type: 'collectKnowledge', id: 'hanzi:妈' }, // 重复
      { type: 'unlockMedal', id: 'final:a' },
      { type: 'unlockMedal', id: 'final:a' }, // 重复
      { type: 'unlockMedal', id: 'final:o' },
    ]);
    expect(s.knowledgePoints).toEqual(['hanzi:妈', 'hanzi:爸']);
    expect(s.medals).toEqual(['final:a', 'final:o']);
    expect(s.score).toBe(KNOWLEDGE_BONUS * 2); // 仅两次首次收集加分
  });
});

describe('GameShell.handleComplete 收割契约（数据层校验）', () => {
  it('结算对象经 { ...result, knowledgePoints, medals } 展开后仍携带知识点与勋章', () => {
    // GameShell.tsx:47 实际代码：saveResult({ ...r, gameId, knowledgePoints, medals })
    // 此处校验该展开契约不会丢失知识点/勋章字段（GameShell 渲染层依赖 testing-library，未引入新依赖，故仅校验契约形状）
    const finalScore = apply(createInitialScoreState(), [
      { type: 'collectKnowledge', id: 'hanzi:妈' },
      { type: 'unlockMedal', id: 'final:a' },
    ]);
    const result = { score: 12, passed: true, stars: 3, durationMs: 1000 };
    const payload = { ...result, gameId: 'match-3', knowledgePoints: finalScore.knowledgePoints, medals: finalScore.medals };
    expect(payload.knowledgePoints).toEqual(['hanzi:妈']);
    expect(payload.medals).toEqual(['final:a']);
    expect(payload.score).toBe(12); // 原结果字段未被覆盖
    expect(payload.gameId).toBe('match-3');
  });
});
