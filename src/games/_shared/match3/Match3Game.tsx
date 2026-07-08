import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { GridBoard } from '../../../components/GridBoard';
import { Card, type CardTone } from '../../../components/Card';
import { useScore } from '../../../state/ScoreContext';
import { useTTS } from '../../../sound/useTTS';
import { computeStars, delay } from '../../../utils/gameLoop';
import {
  applySwap,
  buildGrid,
  buildPool,
  detectMatches,
  ensurePlayable,
  hasAdjacentPair,
  hasPossibleMove,
  MATCH3_LEVELS,
  resolveGrid,
  type Match3Level,
  type Match3Subject,
  type TileGrid,
} from './match3Logic';
import type { Coord } from '../matchDetector';

/**
 * 消消乐（汉字 / 英语双学科统一组件）。
 * - 汉字（subject=hanzi）：同「拼音」二连消除（点选相邻同键方块即可配对消除），知识点 `pinyin:xx`。
 * - 英语（subject=english）：同「category」三连消除（相邻交换凑成三连），知识点 `category:xx`。
 * 组件本身不重复造轮子：复用 GameShell 注入的 ScoreContext / TTS，以及共享 matchDetector / GridBoard / Card。
 */
export function Match3Game({ config, sound, tts: ttsManager, onComplete }: GameProps) {
  const subject: Match3Subject = config.subject === 'english' ? 'english' : 'hanzi';
  const tts = useTTS(ttsManager);
  const { addScore, bumpCombo, collectKnowledge, mistakes } = useScore();

  const seedRef = useRef<number>(Date.now());
  const pool = useMemo(() => buildPool(subject, seedRef.current, 48), [subject]);

  const [levelIndex, setLevelIndex] = useState(0);
  const [grid, setGrid] = useState<TileGrid>(() => buildGrid(MATCH3_LEVELS[0], pool, seedRef.current));
  const [selected, setSelected] = useState<Coord | null>(null);
  const [flash, setFlash] = useState<Coord[]>([]);
  const [movesLeft, setMovesLeft] = useState(MATCH3_LEVELS[0].moves);
  const [levelScore, setLevelScore] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);
  const busyRef = useRef<boolean>(false);
  const levelScoreRef = useRef<number>(0);
  const movesRef = useRef<number>(MATCH3_LEVELS[0].moves);

  useEffect(() => {
    if (subject === 'english') tts.speakEn('Match the same group!');
    else tts.speakZh('找出拼音相同的字，两两配对消除！');
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
      const lv = MATCH3_LEVELS[idx];
      let g = buildGrid(lv, pool, seedRef.current + idx * 101);
      // 汉字二连模式：确保开局至少有一对可配对
      if (subject === 'hanzi' && !hasAdjacentPair(g)) {
        for (let retry = 0; retry < 10 && !hasAdjacentPair(g); retry++) {
          g = buildGrid(lv, pool, (seedRef.current + idx * 101 + retry * 37) >>> 0);
        }
      }
      setLevelIndex(idx);
      setGrid(g);
      setMovesLeft(lv.moves);
      setLevelScore(0);
      setSelected(null);
      setFlash([]);
      levelScoreRef.current = 0;
      movesRef.current = lv.moves;
    },
    [pool, subject],
  );

  const handleSwap = useCallback(
    async (a: Coord, b: Coord) => {
      if (busyRef.current || endedRef.current) return;
      const swapped = applySwap(grid, a, b);
      const matches = detectMatches(swapped);

      if (matches.length === 0) {
        // 无效交换：不消耗步数，轻微反馈
        sound.play('wrong');
        return;
      }

      busyRef.current = true;
      setGrid(swapped);
      setSelected(null);
      movesRef.current -= 1;
      setMovesLeft(movesRef.current);

      let cur = swapped;
      let cascade = 0;
      for (;;) {
        const m = detectMatches(cur);
        if (m.length === 0) break;

        // 朗读首个被消除 tile 的读音 / 展示释义
        const first = m[0];
        const ft = cur[first.row][first.col];
        if (ft) {
          if (subject === 'english') tts.speakEn(`${ft.label}. ${ft.sub ?? ''}`);
          else {
            tts.speakZh(ft.label);
            if (ft.meaning) showFlashBanner(`${ft.label} · ${ft.meaning}`);
          }
        }

        setFlash(m);
        sound.play('correct');
        await delay(260);

        const rng = (() => {
          let s = (seedRef.current + cascade * 7919 + m.length * 31) >>> 0;
          return () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 0xffffffff;
          };
        })();
        const res = resolveGrid(cur, m, pool, rng);
        addScore(res.points + Math.min(cascade, 6) * 5);
        bumpCombo();
        res.knowledgePoints.forEach((kp) => collectKnowledge(kp));
        cascade += 1;
        levelScoreRef.current += res.points;
        setLevelScore(levelScoreRef.current);
        cur = res.grid;
        setFlash([]);
        setGrid(cur);
      }

      // 死局重排（不视为失败）
      if (!hasPossibleMove(cur)) {
        cur = ensurePlayable(MATCH3_LEVELS[levelIndex], cur, pool, seedRef.current + 777);
        setGrid(cur);
      }

      busyRef.current = false;

      // 过关 / 失败判定
      const lv = MATCH3_LEVELS[levelIndex];
      if (levelScoreRef.current >= lv.targetScore) {
        if (levelIndex < MATCH3_LEVELS.length - 1) {
          sound.play('levelup');
          startLevel(levelIndex + 1);
        } else {
          finish(true);
        }
      } else if (movesRef.current <= 0) {
        finish(false);
      }
    },
    [
      grid,
      ended,
      endedRef,
      subject,
      sound,
      tts,
      pool,
      levelIndex,
      addScore,
      bumpCombo,
      collectKnowledge,
      showFlashBanner,
      startLevel,
      finish,
    ],
  );

  /** 汉字模式「二连消除」：点选两个相邻同 key 方块，直接配对消除 */
  const handlePair = useCallback(
    async (a: Coord, b: Coord) => {
      if (busyRef.current || endedRef.current) return;
      const ta = grid[a.row][a.col];
      const tb = grid[b.row][b.col];
      if (!ta || !tb || ta.key !== tb.key) {
        // 不同 key → 切换选中，不消耗步数
        setSelected(b);
        sound.play('wrong');
        return;
      }

      busyRef.current = true;
      const matched: Coord[] = [a, b];
      setSelected(null);
      setFlash(matched);
      sound.play('correct');

      // TTS 朗读被消除的汉字/单词
      if (subject === 'english') tts.speakEn(`${ta.label}. ${ta.sub ?? ''}`);
      else {
        tts.speakZh(ta.label);
        if (ta.meaning) showFlashBanner(`${ta.label} · ${ta.meaning}`);
      }
      await delay(260);

      const rng = (() => {
        let s = (seedRef.current + matched.length * 31) >>> 0;
        return () => {
          s = (s * 1664525 + 1013904223) >>> 0;
          return s / 0xffffffff;
        };
      })();
      const res = resolveGrid(grid, matched, pool, rng);
      addScore(res.points);
      bumpCombo();
      res.knowledgePoints.forEach((kp) => collectKnowledge(kp));
      levelScoreRef.current += res.points;
      setLevelScore(levelScoreRef.current);
      movesRef.current -= 1;
      setMovesLeft(movesRef.current);

      let cur = res.grid;
      setFlash([]);
      setGrid(cur);

      // 死局重排（无可配对相邻对）
      if (!hasAdjacentPair(cur)) {
        showFlashBanner('重新洗牌～');
        cur = buildGrid(MATCH3_LEVELS[levelIndex], pool, (seedRef.current + 777) >>> 0);
        // 兜底：最多重试 10 次直到出现可配对对
        for (let retry = 0; retry < 10 && !hasAdjacentPair(cur); retry++) {
          cur = buildGrid(MATCH3_LEVELS[levelIndex], pool, (seedRef.current + 777 + retry) >>> 0);
        }
        setGrid(cur);
      }

      busyRef.current = false;

      const lv = MATCH3_LEVELS[levelIndex];
      if (levelScoreRef.current >= lv.targetScore) {
        if (levelIndex < MATCH3_LEVELS.length - 1) {
          sound.play('levelup');
          startLevel(levelIndex + 1);
        } else {
          finish(true);
        }
      } else if (movesRef.current <= 0) {
        finish(false);
      }
    },
    [
      grid,
      ended,
      endedRef,
      subject,
      sound,
      tts,
      pool,
      levelIndex,
      addScore,
      bumpCombo,
      collectKnowledge,
      showFlashBanner,
      startLevel,
      finish,
    ],
  );

  const onCellClick = useCallback(
    (pos: { row: number; col: number }) => {
      if (busyRef.current || endedRef.current) return;
      const coord: Coord = { row: pos.row, col: pos.col };
      if (!selected) {
        setSelected(coord);
        sound.play('click');
        return;
      }
      if (selected.row === coord.row && selected.col === coord.col) {
        setSelected(null);
        return;
      }

      // 汉字模式：二连消除（点击两个相邻同 key 方块配对）
      if (subject === 'hanzi') {
        const adjacent =
          Math.abs(selected.row - coord.row) + Math.abs(selected.col - coord.col) === 1;
        if (!adjacent) {
          setSelected(coord);
          sound.play('click');
          return;
        }
        void handlePair(selected, coord);
        return;
      }

      // 英语模式：三连消除（交换后检测三连）
      const adjacent =
        Math.abs(selected.row - coord.row) + Math.abs(selected.col - coord.col) === 1;
      if (!adjacent) {
        setSelected(coord);
        sound.play('click');
        return;
      }
      void handleSwap(selected, coord);
    },
    [selected, sound, handleSwap, handlePair, subject],
  );

  const isFlashing = (r: number, c: number) => flash.some((f) => f.row === r && f.col === c);
  const isSelected = (r: number, c: number) => selected?.row === r && selected?.col === c;
  const level = MATCH3_LEVELS[levelIndex];

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
        ariaLabel={subject === 'english' ? 'English match-3 board' : '汉字消消乐棋盘'}
        renderCell={({ row, col }) => {
          const tile = grid[row][col];
          if (!tile) return <div className="w-full aspect-square rounded-3xl bg-white/40" />;
          const tone: CardTone = tile.tone;
          const flashing = isFlashing(row, col);
          const sel = isSelected(row, col);
          return (
            <Card
              key={`${row},${col}`}
              emoji={tile.emoji}
              label={tile.label}
              sub={tile.sub}
              tone={tone}
              selected={sel}
              matched={flashing}
              onClick={() => onCellClick({ row, col })}
              className={flashing ? 'animate-pop' : ''}
            />
          );
        }}
      />

      <p className="text-inkSoft text-sm">
        {subject === 'english'
          ? '把相同类别的单词连成三个消除～'
          : '把拼音相同的汉字两两配对消除～'}
      </p>
    </div>
  );
}

export default Match3Game;
