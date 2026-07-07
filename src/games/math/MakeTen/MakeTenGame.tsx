import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import {
  generateBoard,
  freeTileIds,
  type MakeTenLevel,
  type MakeTenTile,
} from './makeTenLogic';
import makeTenData from '../../../data/math.json';

const levels = (makeTenData as { makeTen: { levels: MakeTenLevel[] } }).makeTen.levels;
const CELL = 66;

/**
 * 凑十法（羊了个羊式消层配对消除）：
 * 点击两张“和为10”的卡片即可消除，上层遮挡下层，需分层清理。
 */
export function MakeTenGame({ sound, tts, onComplete }: GameProps) {
  const { addScore, bumpCombo, resetCombo, addMistake, mistakes, combo } = useScore();
  const [levelIndex, setLevelIndex] = useState(0);
  const [board, setBoard] = useState<{ tiles: MakeTenTile[] }>(() => generateBoard(levels[0]));
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);

  useEffect(() => {
    tts.speak('点击两张凑成十的卡片消除！');
  }, []);

  const freeIds = useMemo(() => freeTileIds(board.tiles, removed), [board.tiles, removed]);

  const maxX = Math.max(...board.tiles.map((t) => t.x), 0);
  const maxY = Math.max(...board.tiles.map((t) => t.y), 0);
  const width = (maxX + 1) * CELL;
  const height = (maxY + 1) * CELL;

  const finish = (): void => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes, durationMs });
    onComplete({ score: 0, passed: true, stars, durationMs });
  };

  const handleTile = (tile: MakeTenTile): void => {
    if (ended) return;
    if (removed.has(tile.id) || !freeIds.has(tile.id)) return;
    sound.play('click');

    if (selected === null) {
      setSelected(tile.id);
      return;
    }
    if (selected === tile.id) {
      setSelected(null);
      return;
    }

    const a = board.tiles.find((t) => t.id === selected);
    if (!a) {
      setSelected(tile.id);
      return;
    }

    if (a.value + tile.value === 10) {
      const nr = new Set(removed);
      nr.add(a.id);
      nr.add(tile.id);
      setRemoved(nr);
      setSelected(null);
      addScore(10 + Math.min(combo, 5) * 2);
      bumpCombo();
      sound.play('correct');

      if (nr.size === board.tiles.length) {
        if (levelIndex < levels.length - 1) {
          sound.play('levelup');
          const ni = levelIndex + 1;
          setLevelIndex(ni);
          setBoard(generateBoard(levels[ni]));
          setRemoved(new Set());
          setSelected(null);
        } else {
          finish();
        }
      }
    } else {
      addMistake();
      resetCombo();
      sound.play('wrong');
      setSelected(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center text-ink font-bold">
        第 {levelIndex + 1} / {levels.length} 关 · 点击两张凑成 10 的卡片消除！
      </div>

      <div
        className="relative mx-auto bg-white/50 rounded-4xl shadow-soft"
        style={{ width, height, touchAction: 'manipulation' }}
      >
        {board.tiles.map((t) => {
          const isRemoved = removed.has(t.id);
          const isFree = freeIds.has(t.id);
          const isSel = selected === t.id;
          if (isRemoved) return null;
          return (
            <button
              key={t.id}
              disabled={!isFree}
              onClick={() => handleTile(t)}
              className={[
                'absolute flex flex-col items-center justify-center rounded-3xl font-bold transition-all duration-150',
                isFree ? 'bg-mint shadow-soft active:scale-95 cursor-pointer' : 'bg-mint/40 cursor-default',
                isSel ? 'ring-4 ring-white scale-110 z-10' : '',
              ].join(' ')}
              style={{
                left: t.x * CELL + 5,
                top: t.y * CELL + 5,
                width: CELL - 10,
                height: CELL - 10,
                zIndex: t.layer * 2 + (isSel ? 1 : 0),
              }}
            >
              <span className="text-4xl leading-none">{t.emoji}</span>
            </button>
          );
        })}
      </div>

      <p className="text-inkSoft text-sm">剩余 {board.tiles.length - removed.size} 张</p>
    </div>
  );
}

export default MakeTenGame;
