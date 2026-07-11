import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';

/**
 * ScoreContext —— 游戏运行期分数 / 连击 / 知识点 / 勋章 的共享状态。
 * 由 GameShell 在游戏外层包裹，游戏组件通过 useScore() 读写。
 *
 * 实现以纯函数 `scoreReducer` 为核心，便于在 node 环境单测（不依赖 React 渲染）。
 */

/** 收集一个知识点时的小额奖励分（可附小奖励分） */
export const KNOWLEDGE_BONUS = 2;

export interface ScoreState {
  score: number;
  combo: number;
  mistakes: number;
  rounds: number;
  /** 本局收集的知识点 id（如 "hanzi:妈"），去重 */
  knowledgePoints: string[];
  /** 本局解锁的勋章 id（如 "final:a"），去重 */
  medals: string[];
}

export type ScoreAction =
  | { type: 'addScore'; n: number }
  | { type: 'bumpCombo' }
  | { type: 'resetCombo' }
  | { type: 'addMistake' }
  | { type: 'addRound' }
  | { type: 'reset' }
  | { type: 'collectKnowledge'; id: string }
  | { type: 'unlockMedal'; id: string };

export interface ScoreContextValue extends ScoreState {
  addScore: (n: number) => void;
  bumpCombo: () => void;
  resetCombo: () => void;
  addMistake: () => void;
  addRound: () => void;
  reset: () => void;
  /** 去重收集知识点（首次收集附小额奖励分） */
  collectKnowledge: (id: string) => void;
  /** 去重解锁勋章 */
  unlockMedal: (id: string) => void;
  /**
   * 同步镜像 refs：reducer 状态在事件处理中滞后于最新 dispatch，
   * finish() 时直接读取这些 ref 可获取当前真实累计值（分数/失误/知识点/勋章），
   * 避免“落盘 0 分”与知识点/勋章漏存（见 CODE_REVIEW_REPORT H2/H3/M6）。
   */
  scoreRef: MutableRefObject<number>;
  mistakesRef: MutableRefObject<number>;
  knowledgeRef: MutableRefObject<string[]>;
  medalsRef: MutableRefObject<string[]>;
}

export function createInitialScoreState(): ScoreState {
  return {
    score: 0,
    combo: 0,
    mistakes: 0,
    rounds: 0,
    knowledgePoints: [],
    medals: [],
  };
}

export function scoreReducer(state: ScoreState, action: ScoreAction): ScoreState {
  switch (action.type) {
    case 'addScore':
      return { ...state, score: state.score + action.n };
    case 'bumpCombo':
      return { ...state, combo: state.combo + 1 };
    case 'resetCombo':
      return { ...state, combo: 0 };
    case 'addMistake':
      return { ...state, mistakes: state.mistakes + 1, combo: 0 };
    case 'addRound':
      return { ...state, rounds: state.rounds + 1 };
    case 'reset':
      return createInitialScoreState();
    case 'collectKnowledge': {
      if (state.knowledgePoints.includes(action.id)) return state;
      return {
        ...state,
        knowledgePoints: [...state.knowledgePoints, action.id],
        score: state.score + KNOWLEDGE_BONUS,
      };
    }
    case 'unlockMedal': {
      if (state.medals.includes(action.id)) return state;
      return { ...state, medals: [...state.medals, action.id] };
    }
    default:
      return state;
  }
}

const ScoreContext = createContext<ScoreContextValue | null>(null);

export function ScoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scoreReducer, undefined, createInitialScoreState);

  // 同步镜像：在回调中随 dispatch 一并更新，保证 finish() 时能读到最新累计值。
  const scoreRef = useRef<number>(0);
  const mistakesRef = useRef<number>(0);
  const knowledgeRef = useRef<string[]>([]);
  const medalsRef = useRef<string[]>([]);

  const addScore = useCallback((n: number) => {
    scoreRef.current += n;
    dispatch({ type: 'addScore', n });
  }, []);
  const bumpCombo = useCallback(() => dispatch({ type: 'bumpCombo' }), []);
  const resetCombo = useCallback(() => dispatch({ type: 'resetCombo' }), []);
  const addMistake = useCallback(() => {
    mistakesRef.current += 1;
    dispatch({ type: 'addMistake' });
  }, []);
  const addRound = useCallback(() => dispatch({ type: 'addRound' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []); // 运行期经 ScoreProvider 重挂载，refs 自然重置
  const collectKnowledge = useCallback((id: string) => {
    if (!knowledgeRef.current.includes(id)) {
      knowledgeRef.current = [...knowledgeRef.current, id];
      scoreRef.current += KNOWLEDGE_BONUS;
    }
    dispatch({ type: 'collectKnowledge', id });
  }, []);
  const unlockMedal = useCallback((id: string) => {
    if (!medalsRef.current.includes(id)) medalsRef.current = [...medalsRef.current, id];
    dispatch({ type: 'unlockMedal', id });
  }, []);

  const value = useMemo<ScoreContextValue>(
    () => ({
      ...state,
      addScore,
      bumpCombo,
      resetCombo,
      addMistake,
      addRound,
      reset,
      collectKnowledge,
      unlockMedal,
      scoreRef,
      mistakesRef,
      knowledgeRef,
      medalsRef,
    }),
    [
      state,
      addScore,
      bumpCombo,
      resetCombo,
      addMistake,
      addRound,
      reset,
      collectKnowledge,
      unlockMedal,
      scoreRef,
      mistakesRef,
      knowledgeRef,
      medalsRef,
    ],
  );

  return <ScoreContext.Provider value={value}>{children}</ScoreContext.Provider>;
}

export function useScore(): ScoreContextValue {
  const ctx = useContext(ScoreContext);
  if (!ctx) {
    throw new Error('useScore 必须在 <ScoreProvider> 内部使用');
  }
  return ctx;
}
