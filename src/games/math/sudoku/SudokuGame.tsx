/**
 * 数独玩法主组件。
 * SudokuCore 实现「选尺寸/难度 → 生成题目 → 点格选数填值 → 判完成」的完整流程，
 * 三种模式（standard / letter / arithmetic）共用此核心逻辑。
 * SudokuGame 为标准数独的薄封装（mode='standard'）。
 *
 * 注：因 Windows 文件系统大小写不敏感，原规格的 Sudoku/ 与 sudoku/ 目录会冲突，
 * 故将 SudokuGame 并入小写 sudoku/ 目录，避免同目录双名碰撞导致 tsc 失败。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Board as BoardType, Cage, SudokuMode, SudokuSize } from './types';
import { BOX } from './types';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { Board } from './Board';
import { CandidatePanel } from './CandidatePanel';
import {
  generateSudoku,
  validateCell,
  isComplete,
  makeCages,
  cloneBoard,
  emptyBoard,
} from './engine';
import { saveBest } from './progress';

/** 各模式的进入语音提示。 */
const TTS_TEXT: Record<SudokuMode, string> = {
  standard: '点空格，再从下面选一个数字填进去！',
  letter: '点空格，再从下面选一个字母填进去！',
  arithmetic: '看虚线框里的数字和，把数字填进去！',
};

/** 各模式标题。 */
const TITLE: Record<SudokuMode, string> = {
  standard: '数独',
  letter: '字母数独',
  arithmetic: '算术数独',
};

/** 根据尺寸与密度返回挖空数（可微调到唯一解可达）。 */
function holesFor(size: SudokuSize, density: 'few' | 'many'): number {
  if (size === 6) return density === 'few' ? 22 : 28;
  return density === 'few' ? 50 : 58;
}

export interface SudokuCoreProps extends GameProps {
  mode: SudokuMode;
  gameKey: string;
}

/** 数独核心玩法组件（被三种模式复用）。 */
export function SudokuCore(props: SudokuCoreProps) {
  const { sound, tts, onComplete, mode, gameKey } = props;
  const { addMistake, mistakes } = useScore();

  const [phase, setPhase] = useState<'select' | 'play'>('select');
  const [size, setSize] = useState<SudokuSize>(6);
  const [density, setDensity] = useState<'few' | 'many'>('few');
  const [board, setBoard] = useState<BoardType>(() => emptyBoard(6));
  const [solution, setSolution] = useState<BoardType>(() => emptyBoard(6));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [cages, setCages] = useState<Cage[] | undefined>(undefined);
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);

  // 进入玩法时朗读规则。
  useEffect(() => {
    if (phase === 'play') tts.speak(TTS_TEXT[mode]);
  }, [phase, mode]);

  const startGame = (): void => {
    const holes = holesFor(size, density);
    const seed = Math.floor(Math.random() * 1_000_000_000);
    const { puzzle, solution: sol } = generateSudoku(size, holes, seed);
    setBoard(puzzle);
    setSolution(sol);
    setCages(mode === 'arithmetic' ? makeCages(size, sol, seed) : undefined);
    setSelected(null);
    setEnded(false);
    endedRef.current = false;
    startRef.current = Date.now();
    setPhase('play');
  };

  const handleCellClick = (r: number, c: number): void => {
    if (ended) return;
    if (board[r][c].given) return;
    sound.play('click');
    setSelected([r, c]);
  };

  const finish = (): void => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes, durationMs });
    sound.play('win');
    // 任何尺寸完成都记录最佳成绩（9×9 不再强制先通关 6×6 才能解锁）。
    saveBest(gameKey, stars, durationMs);
    onComplete({ score: 0, passed: true, stars, durationMs });
  };

  const handlePick = (val: number): void => {
    if (ended || !selected) return;
    const [r, c] = selected;
    if (board[r][c].given) return;
    sound.play('click');

    // 与已填数字冲突 → 判错并清空该格。
    if (!validateCell(board, r, c, val)) {
      addMistake();
      sound.play('wrong');
      setBoard((prev) => {
        const nb = cloneBoard(prev);
        nb[r][c].value = null;
        return nb;
      });
      return;
    }

    // 合法但与唯一解不符 → 判错并清空，便于低龄纠错。
    if (val !== solution[r][c].value) {
      addMistake();
      sound.play('wrong');
      setBoard((prev) => {
        const nb = cloneBoard(prev);
        nb[r][c].value = null;
        return nb;
      });
      return;
    }

    // 合法且正确 → 填绿 + 正确音效。
    const nb = cloneBoard(board);
    nb[r][c].value = val;
    setBoard(nb);
    sound.play('correct');
    if (isComplete(nb)) finish();
  };

  // 当前选中格所在行/列/宫已用数字 → 候选面板置灰。
  const disabledValues = useMemo<Set<number>>(() => {
    const s = new Set<number>();
    if (!selected) return s;
    const [r, c] = selected;
    for (let i = 0; i < size; i++) {
      if (i !== c && board[r][i].value !== null) s.add(board[r][i].value as number);
      if (i !== r && board[i][c].value !== null) s.add(board[i][c].value as number);
    }
    const { rows, cols } = BOX[size];
    const br = Math.floor(r / rows) * rows;
    const bc = Math.floor(c / cols) * cols;
    for (let rr = br; rr < br + rows; rr++) {
      for (let cc = bc; cc < bc + cols; cc++) {
        if ((rr !== r || cc !== c) && board[rr][cc].value !== null) {
          s.add(board[rr][cc].value as number);
        }
      }
    }
    return s;
  }, [selected, board, size]);

  if (phase === 'select') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-center text-ink font-extrabold text-2xl">{TITLE[mode]}</div>
        <div className="text-inkSoft text-sm">选择尺寸与难度</div>

        <div className="flex gap-3">
          {([6, 9] as SudokuSize[]).map((s) => {
            const active = size === s;
            return (
              <button
                key={s}
                onClick={() => {
                  sound.play('click');
                  setSize(s);
                }}
                className={[
                  'px-5 py-3 rounded-3xl font-bold shadow-soft transition-all',
                  active
                    ? 'bg-mint text-ink scale-105'
                    : 'bg-white text-ink hover:bg-mint/30 cursor-pointer',
                ].join(' ')}
              >
                {s} × {s}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          {(['few', 'many'] as const).map((d) => {
            const active = density === d;
            const label = d === 'few' ? '少（简单）' : '多（挑战）';
            return (
              <button
                key={d}
                onClick={() => {
                  sound.play('click');
                  setDensity(d);
                }}
                className={[
                  'px-5 py-3 rounded-3xl font-bold shadow-soft transition-all',
                  active
                    ? 'bg-lemon text-ink scale-105'
                    : 'bg-white text-ink hover:bg-lemon/40 cursor-pointer',
                ].join(' ')}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            sound.play('click');
            startGame();
          }}
          className="mt-2 px-8 py-3 rounded-4xl bg-peach text-white font-extrabold text-lg shadow-soft active:scale-95"
        >
          开始游戏
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center text-ink font-bold">{TITLE[mode]}</div>
      <Board
        size={size}
        board={board}
        selected={selected}
        onCellClick={handleCellClick}
        cages={cages}
        letterMode={mode === 'letter'}
      />
      <CandidatePanel
        size={size}
        letterMode={mode === 'letter'}
        onPick={handlePick}
        disabled={disabledValues}
      />
    </div>
  );
}

/** 标准数独（mode='standard'）。 */
export function SudokuGame(props: GameProps) {
  return <SudokuCore {...props} mode="standard" gameKey="sudoku" />;
}

export default SudokuGame;
