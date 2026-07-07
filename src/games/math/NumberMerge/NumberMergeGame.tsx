import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import { createBoard, move, tileColor, type Dir, type MergeState } from './mergeLogic';
import mergeData from '../../../data/math.json';

const cfg = mergeData as { numberMerge: { size: number; target: number } };
const SIZE = cfg.numberMerge.size;
const TARGET = cfg.numberMerge.target;

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

/**
 * 数字合成（2048 式）：滑动合并相同数字，合成目标数字即获胜。
 */
export function NumberMergeGame({ sound, tts, onComplete, onExit }: GameProps) {
  const { addScore } = useScore();
  const [state, setState] = useState<MergeState>(() => createBoard(SIZE, TARGET));
  const [ended, setEnded] = useState(false);
  const [hint, setHint] = useState('滑动或点击方向键合成数字！');
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    tts.speak('滑动或点击方向键，合成相同的数字！');
  }, []);

  useEffect(() => {
    if (state.over && !endedRef.current) {
      endedRef.current = true;
      setEnded(true);
      const durationMs = Date.now() - startRef.current;
      const stars = state.won
        ? computeStars({ passed: true, mistakes: 0, durationMs, starDurationMs: 180000 })
        : Math.max(1, Math.min(2, Math.floor(state.score / 800) + 1));
      onComplete({ score: state.score, passed: state.won, stars, durationMs });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.over]);

  const doMove = (dir: Dir): void => {
    if (ended || state.over) return;
    setState((prev) => {
      const next = move(prev, dir);
      if (next.score > prev.score) {
        addScore(next.score - prev.score);
        sound.play('click');
      }
      if (next.won && !prev.won) sound.play('win');
      return next;
    });
  };

  const onPointerDown = (e: React.PointerEvent): void => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent): void => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = null;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 24) return;
    if (absX > absY) doMove(dx > 0 ? 'right' : 'left');
    else doMove(dy > 0 ? 'down' : 'up');
  };

  const handleKey = (e: React.KeyboardEvent): void => {
    const map: Record<string, Dir> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    };
    if (map[e.key]) {
      e.preventDefault();
      doMove(map[e.key]);
    }
  };

  const cell = Math.min(72, Math.floor((window.innerWidth - 48) / SIZE));

  return (
    <div className="flex flex-col items-center gap-3" onKeyDown={handleKey} tabIndex={0}>
      <div className="flex items-center justify-between w-full max-w-xs">
        <div className="px-3 py-1.5 rounded-2xl bg-lemon/80 font-bold text-ink">
          目标 {TARGET}
        </div>
        <div className="px-3 py-1.5 rounded-2xl bg-peach/80 font-bold text-ink">
          分数 {state.score}
        </div>
      </div>

      <div
        className="relative grid bg-white/60 rounded-4xl shadow-soft p-2 select-none"
        style={{
          gridTemplateColumns: `repeat(${SIZE}, ${cell}px)`,
          gridTemplateRows: `repeat(${SIZE}, ${cell}px)`,
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {state.board.flat().map((v, idx) => (
          <div
            key={idx}
            className="m-1 rounded-2xl flex items-center justify-center font-extrabold text-ink transition-all"
            style={{
              width: cell - 8,
              height: cell - 8,
              background: tileColor(v),
              fontSize: v >= 1000 ? cell * 0.32 : cell * 0.42,
            }}
          >
            {v !== 0 ? v : ''}
          </div>
        ))}
      </div>

      <p className="text-inkSoft text-sm text-center">{hint}</p>

      <div className="grid grid-cols-3 gap-2 w-44">
        <span />
        <button
          className="h-11 rounded-2xl bg-mint shadow-press active:scale-95 text-xl"
          onClick={() => doMove('up')}
        >
          ↑
        </button>
        <span />
        <button
          className="h-11 rounded-2xl bg-mint shadow-press active:scale-95 text-xl"
          onClick={() => doMove('left')}
        >
          ←
        </button>
        <button
          className="h-11 rounded-2xl bg-mint shadow-press active:scale-95 text-xl"
          onClick={() => doMove('down')}
        >
          ↓
        </button>
        <button
          className="h-11 rounded-2xl bg-mint shadow-press active:scale-95 text-xl"
          onClick={() => doMove('right')}
        >
          →
        </button>
      </div>

      <button
        className="mt-1 px-4 py-2 rounded-2xl bg-white shadow-soft text-ink font-bold"
        onClick={onExit}
      >
        结束本局
      </button>
    </div>
  );
}

export default NumberMergeGame;
