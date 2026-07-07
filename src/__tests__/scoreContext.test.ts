/**
 * ScoreContext 纯逻辑测试（node 环境，不依赖 React 渲染）。
 * 直接验证 createInitialScoreState / scoreReducer / KNOWLEDGE_BONUS，
 * 覆盖分数、连击、失误、回合，以及知识点收集与勋章解锁的去重与奖励分。
 */
import { describe, expect, it } from 'vitest';
import {
  createInitialScoreState,
  scoreReducer,
  KNOWLEDGE_BONUS,
  type ScoreState,
} from '../state/ScoreContext';

describe('createInitialScoreState', () => {
  it('归零且集合为空', () => {
    const s = createInitialScoreState();
    expect(s.score).toBe(0);
    expect(s.combo).toBe(0);
    expect(s.mistakes).toBe(0);
    expect(s.rounds).toBe(0);
    expect(s.knowledgePoints).toEqual([]);
    expect(s.medals).toEqual([]);
  });
});

describe('scoreReducer · 基础动作', () => {
  it('addScore / bumpCombo / addRound', () => {
    let s: ScoreState = createInitialScoreState();
    s = scoreReducer(s, { type: 'addScore', n: 5 });
    expect(s.score).toBe(5);
    s = scoreReducer(s, { type: 'bumpCombo' });
    s = scoreReducer(s, { type: 'bumpCombo' });
    expect(s.combo).toBe(2);
    s = scoreReducer(s, { type: 'addRound' });
    expect(s.rounds).toBe(1);
  });

  it('addMistake 清零连击并计数', () => {
    let s: ScoreState = createInitialScoreState();
    s = scoreReducer(s, { type: 'bumpCombo' });
    s = scoreReducer(s, { type: 'addMistake' });
    expect(s.mistakes).toBe(1);
    expect(s.combo).toBe(0);
  });

  it('reset 回到初始状态', () => {
    let s: ScoreState = createInitialScoreState();
    s = scoreReducer(s, { type: 'addScore', n: 10 });
    s = scoreReducer(s, { type: 'reset' });
    expect(s).toEqual(createInitialScoreState());
  });
});

describe('scoreReducer · collectKnowledge', () => {
  it('首次收集附奖励分，重复收集去重不重复加分', () => {
    let s: ScoreState = createInitialScoreState();
    s = scoreReducer(s, { type: 'collectKnowledge', id: 'hanzi:妈' });
    expect(s.knowledgePoints).toEqual(['hanzi:妈']);
    expect(s.score).toBe(KNOWLEDGE_BONUS);

    s = scoreReducer(s, { type: 'collectKnowledge', id: 'hanzi:妈' });
    expect(s.knowledgePoints).toEqual(['hanzi:妈']);
    expect(s.score).toBe(KNOWLEDGE_BONUS); // 不重复加分

    s = scoreReducer(s, { type: 'collectKnowledge', id: 'hanzi:爸' });
    expect(s.knowledgePoints).toEqual(['hanzi:妈', 'hanzi:爸']);
    expect(s.score).toBe(KNOWLEDGE_BONUS * 2);
  });
});

describe('scoreReducer · unlockMedal', () => {
  it('重复解锁去重', () => {
    let s: ScoreState = createInitialScoreState();
    s = scoreReducer(s, { type: 'unlockMedal', id: 'final:a' });
    s = scoreReducer(s, { type: 'unlockMedal', id: 'final:a' });
    expect(s.medals).toEqual(['final:a']);
  });
});
