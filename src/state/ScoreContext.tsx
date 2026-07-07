import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * ScoreContext —— 游戏运行期分数与连击的共享状态。
 * 由 GameShell 在游戏外层包裹，游戏组件通过 useScore() 读写。
 */
export interface ScoreState {
  score: number;
  combo: number;
  mistakes: number;
  rounds: number;
}

export interface ScoreContextValue extends ScoreState {
  addScore: (n: number) => void;
  bumpCombo: () => void;
  resetCombo: () => void;
  addMistake: () => void;
  addRound: () => void;
  reset: () => void;
}

const ScoreContext = createContext<ScoreContextValue | null>(null);

export function ScoreProvider({ children }: { children: ReactNode }) {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [rounds, setRounds] = useState(0);

  const addScore = useCallback((n: number) => setScore((s) => s + n), []);
  const bumpCombo = useCallback(() => setCombo((c) => c + 1), []);
  const resetCombo = useCallback(() => setCombo(0), []);
  const addMistake = useCallback(() => {
    setMistakes((m) => m + 1);
    setCombo(0);
  }, []);
  const addRound = useCallback(() => setRounds((r) => r + 1), []);
  const reset = useCallback(() => {
    setScore(0);
    setCombo(0);
    setMistakes(0);
    setRounds(0);
  }, []);

  const value = useMemo<ScoreContextValue>(
    () => ({
      score,
      combo,
      mistakes,
      rounds,
      addScore,
      bumpCombo,
      resetCombo,
      addMistake,
      addRound,
      reset,
    }),
    [score, combo, mistakes, rounds, addScore, bumpCombo, resetCombo, addMistake, addRound, reset],
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
