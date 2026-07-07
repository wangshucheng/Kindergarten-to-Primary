import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { GridBoard } from '../../../components/GridBoard';
import { Card, type CardTone } from '../../../components/Card';
import { useScore } from '../../../state/ScoreContext';
import { useTTS } from '../../../sound/useTTS';
import { computeStars, delay } from '../../../utils/gameLoop';
import {
  buildGrid,
  buildPool,
  BRICK_LEVELS,
  ensurePlayable,
  findGroup,
  hasPossibleMove,
  resolveGrid,
  type BrickGrid,
  type BrickLevel,
  type BrickSubject,
  type BrickTile,
} from './brickMatchLogic';
import type { Coord } from '../matchDetector';

/**
 * 砖了个砖（汉字 / 英语双学科统一组件）。
 * - 汉字（subject=hanzi）：同「拼音」相邻 ≥2 连块消除，TTS 朗读该字并展示释义；知识点收集 `pinyin:xx`。
 * - 英语（subject=english）：同「category」相邻 ≥2 连块消除，TTS 朗读单词与释义；知识点收集 `category:xx`。
 * 复用 GameShell 注入的 ScoreContext / TTS，以及共享 GridBoard / Card / computeStars。
 */
export function BrickMatchGame({ config, sound, tts: ttsManager, onComplete }: GameProps) {
  const subject: BrickSubject = config.subject === 'english' ? 'english' : 'hanzi';
  const tts = useTTS(ttsManager);
  const { addScore, bumpCombo, collectKnowledge, mistakes } = useScore();

  const seedRef = useRef<number>(Date.now());
  const pool = useMemoPool(subject, seedRef);

  const [levelIndex, setLevelIndex] = useState(0);
  const [grid, setGrid] = useState<BrickGrid>(() => buildGrid(BRICK_LEVELS[0], pool, seedRef.current));
  const [flash, setFlash] = useState<Coord[]>([]);
  const [movesLeft, setMovesLeft] = useState(BRICK_LEVELS[0].moves);
  const [levelScore, setLevelScore] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);
  const busyRef = useRef<boolean>(false);
  const levelScoreRef = useRef<number>(0);
  const movesRef = useRef<number>(BRICK_LEVELS[0].moves);

  useEffect(() => {
    if (subject === 'english') tts.speakEn('Tap a group of the same kind!');
    else tts.speakZh('点相同拼音的砖块，连成两块以上就消除！');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showFlashBanner = useCallback((text: string) => {
    setBanner(text);
    window.setTimeout(() => setBanner(null), 1100);
  }, []);

  const finish = useCallback(
    (passed: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setEnded(true);
      const durationMs = Date.now() - startRef.current;
      const stars = computeStars({ passed, mistakes, durationMs });
      onComplete({ score: 0, passed, stars, durationMs });
    },
    [mistakes, onComplete],
  );

  const startLevel = useCallback(
    (idx: number) => {
      const lv = BRICK_LEVELS[idx];
      const g = buildGrid(lv, pool, (seedRef.current + idx * 101) >>> 0);
      setLevelIndex(idx);
      setGrid(g);
      setMovesLeft(lv.moves);
      setLevelScore(0);
      setFlash([]);
      levelScoreRef.current = 0;
      movesRef.current = lv.moves;
    },
    [pool],
  );

  const onCellClick = useCallback(
    async (pos: { row: number; col: number }) => {
      if (busyRef.current || endedRef.current) return;
      const lv = BRICK_LEVELS[levelIndex];
      const group = findGroup(grid, { row: pos.row, col: pos.col });

      // 连通块 <2：不可消除，轻微反馈，不消耗步数
      if (group.length < 2) {
        sound.play('wrong');
        return;
      }

      busyRef.current = true;
      movesRef.current -= 1;
      setMovesLeft(movesRef.current);

      const firstTile = grid[group[0].row][group[0].col];
      if (firstTile) {
        if (subject === 'english') tts.speakEn(`${firstTile.label}. ${firstTile.sub ?? ''}`);
        else {
          tts.speakZh(firstTile.label);
          if (firstTile.meaning) showFlashBanner(`${firstTile.label} · ${firstTile.meaning}`);
        }
      }

      setFlash(group);
      sound.play('correct');
      await delay(240);

      const rng = (() => {
        let s = (seedRef.current + pos.row * 911 + pos.col * 877 + group.length * 31) >>> 0;
        return () => {
          s = (s * 1664525 + 1013904223) >>> 0;
          return s / 0xffffffff;
        };
      })();
      const res = resolveGrid(grid, group, pool, rng);
      addScore(res.points);
      bumpCombo();
      res.knowledgePoints.forEach((kp) => collectKnowledge(kp));
      levelScoreRef.current += res.points;
      setLevelScore(levelScoreRef.current);

      setFlash([]);
      let next = res.grid;
      if (!hasPossibleMove(next)) {
        next = ensurePlayable(lv, next, pool, (seedRef.current + levelIndex * 53 + 777) >>> 0);
      }
      setGrid(next);
      busyRef.current = false;

      if (levelScoreRef.current >= lv.targetScore) {
        if (levelIndex < BRICK_LEVELS.length - 1) {
          sound.play('levelup');
          startLevel(levelIndex + 1);
        } else {
          finish(true);
        }
      } else if (movesRef.current <= 0) {
        finish(false);
      }
    },
    [grid, ended, subject, sound, tts, pool, levelIndex, addScore, bumpCombo, collectKnowledge, showFlashBanner, startLevel, finish],
  );

  const isFlashing = (r: number, c: number) => flash.some((f) => f.row === r && f.col === c);
  const level = BRICK_LEVELS[levelIndex];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center text-ink font-bold">
        {level.title} · 步数 {Math.max(0, movesLeft)} · 目标 {level.targetScore} 分
      </div>

      {banner && (
        <div className="px-4 py-2 rounded-3xl bg-lemon shadow-soft text-ink font-bold animate-pop">
          {banner}
        </div>
      )}

      <GridBoard
        rows={level.rows}
        cols={level.cols}
        gap={2}
        ariaLabel={subject === 'english' ? 'English brick match board' : '汉字砖块棋盘'}
        renderCell={({ row, col }) => {
          const tile = grid[row][col];
          if (!tile) return <div className="w-full aspect-square rounded-3xl bg-white/40" />;
          const tone: CardTone = tile.tone;
          const flashing = isFlashing(row, col);
          return (
            <Card
              key={`${row},${col}`}
              emoji={tile.emoji}
              label={tile.label}
              sub={tile.sub}
              tone={tone}
              matched={flashing}
              onClick={() => onCellClick({ row, col })}
              className={flashing ? 'animate-pop' : ''}
            />
          );
        }}
      />

      <p className="text-inkSoft text-sm">
        {subject === 'english'
          ? '点相同类别的方块，两块以上连成一组就消除～'
          : '点相同拼音的方块，两块以上连成一组就消除～'}
      </p>
    </div>
  );
}

/** 用 useMemo 构建 pool（subject 变化时重建） */
function useMemoPool(subject: BrickSubject, seedRef: React.MutableRefObject<number>): BrickTile[] {
  return useMemo(() => buildPool(subject, seedRef.current, 6), [subject]);
}

export default BrickMatchGame;
