import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { GridBoard } from '../../../components/GridBoard';
import { Card } from '../../../components/Card';
import { useScore } from '../../../state/ScoreContext';
import { useTTS } from '../../../sound/useTTS';
import { computeStars, delay } from '../../../utils/gameLoop';
import { createRng } from '../../../utils/rng';
import { sample } from '../../../utils/shuffle';
import {
  buildPool,
  buildRound,
  GOOSE_LEVELS,
  isMatch,
  roundScore,
  type GooseSubject,
  type GooseTile,
} from './gooseCatchLogic';

/**
 * 抓大鹅（汉字 / 英语双学科统一组件）。
 * - 汉字（subject=hanzi）：按拼音键配对，TTS 中文朗读；知识点收集 `pinyin:xx`。
 * - 英语（subject=english）：按 category 键配对，TTS 英文朗读；知识点收集 `category:xx`。
 * - 复用 GameShell 注入的 ScoreContext / TTS，以及共享 GridBoard / Card。
 */
export function GooseCatchGame({ config, sound, tts: ttsManager, onComplete }: GameProps) {
  const subject: GooseSubject = config.subject === 'english' ? 'english' : 'hanzi';
  const tts = useTTS(ttsManager);
  const { addScore, collectKnowledge, addMistake } = useScore();

  const seedRef = useRef<number>(Date.now());
  const pool = useMemo(() => buildPool(subject, seedRef.current), [subject]);

  const [levelIndex, setLevelIndex] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [tiles, setTiles] = useState<GooseTile[]>([]);
  const [targetKey, setTargetKey] = useState<string>('');
  const [targetTile, setTargetTile] = useState<GooseTile | null>(null);
  const [flashCoord, setFlashCoord] = useState<number | null>(null);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [ended, setEnded] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);
  const busyRef = useRef<boolean>(false);
  const mistakesRef = useRef<number>(0);
  const totalScoreRef = useRef<number>(0);

  const level = GOOSE_LEVELS[levelIndex];

  useEffect(() => {
    if (subject === 'english') tts.speakEn('Catch the goose! Find the matching word.');
    else tts.speakZh('来赶鹅咯！找出拼音对应的字～');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showBanner = useCallback((text: string) => {
    setBanner(text);
    window.setTimeout(() => setBanner(null), 1200);
  }, []);

  const finish = useCallback(
    (passed: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setEnded(true);
      const durationMs = Date.now() - startRef.current;
      const stars = computeStars({ passed, mistakes: mistakesRef.current, durationMs });
      onComplete({ score: totalScoreRef.current, passed, stars, durationMs });
    },
    [onComplete],
  );

  /** 准备某一轮 */
  const prepareRound = useCallback(
    (round: number, lvIdx: number, currentPool: GooseTile[]) => {
      const lv = GOOSE_LEVELS[lvIdx];
      const roundSeed = seedRef.current + lvIdx * 1000 + round * 137;
      const rng = createRng(roundSeed);

      // 从池中选择 distinct key 作为候选
      const keys = [...new Set(currentPool.map((t) => t.key))];
      const shuffled = keys.sort(() => 0); // 先不动，用 shuffle
      const shuffledKeys = keys.slice();
      // Fisher-Yates shuffle with rng
      for (let i = shuffledKeys.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffledKeys[i], shuffledKeys[j]] = [shuffledKeys[j], shuffledKeys[i]];
      }

      const tgt = shuffledKeys[0];
      const dists = shuffledKeys.slice(1, lv.tilesPerRound); // N-1 distractors
      if (dists.length < lv.tilesPerRound - 1) {
        // 如果 distinct key 不够，用 pool 中随机 tile 的 key 补足
        const extraKeys = currentPool.map((t) => t.key).filter((k) => k !== tgt);
        while (dists.length < lv.tilesPerRound - 1) {
          const ek = extraKeys[Math.floor(rng() * extraKeys.length)];
          if (!dists.includes(ek)) dists.push(ek);
        }
      }

      const roundTiles = buildRound(currentPool, tgt, dists, rng);
      setTargetKey(tgt);
      const tgtTile = currentPool.find((t) => t.key === tgt) ?? null;
      setTargetTile(tgtTile);
      setTiles(roundTiles);
      setRoundIndex(round);
      setFlashCoord(null);

      if (subject === 'english') {
        if (tgtTile) tts.speakEn(`Find: ${tgtTile.label}`);
        else tts.speakEn(`Find the word for: ${tgt}`);
      } else {
        if (tgtTile) {
          tts.speakZh(`找一找拼音为 ${tgt} 的字，比如 ${tgtTile.label}`);
        } else {
          tts.speakZh(`找一找拼音 ${tgt} 的字`);
        }
      }
    },
    [subject, tts],
  );

  /** 开始某一关 */
  const startLevel = useCallback(
    (idx: number, currentPool: GooseTile[]) => {
      setLevelIndex(idx);
      setMistakesCount(0);
      setTotalScore(0);
      mistakesRef.current = 0;
      totalScoreRef.current = 0;
      prepareRound(0, idx, currentPool);
    },
    [prepareRound],
  );

  // 初始化第一轮
  useEffect(() => {
    prepareRound(0, 0, pool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = useCallback(
    async (tileIndex: number) => {
      if (busyRef.current || endedRef.current) return;
      busyRef.current = true;

      const tile = tiles[tileIndex];
      if (!tile) {
        busyRef.current = false;
        return;
      }

      const correct = isMatch(tile, targetKey);

      if (correct) {
        // 匹配正确
        setFlashCoord(tileIndex);
        sound.play('correct');
        addScore(roundScore(roundIndex, true));
        collectKnowledge(tile.knowledgePoint);
        totalScoreRef.current += roundScore(roundIndex, true);
        setTotalScore(totalScoreRef.current);

        if (subject === 'english') {
          tts.speakEn(`${tile.label}. ${tile.meaning ?? ''}`);
          showBanner(`${tile.emoji ?? ''} ${tile.label} · ${tile.meaning ?? ''}`);
        } else {
          tts.speakZh(`${tile.label}`);
          showBanner(`${tile.label} · ${tile.meaning ?? tile.sub ?? ''}`);
        }

        await delay(500);
        setFlashCoord(null);

        // 下一轮 或 过关 或 通关
        if (roundIndex + 1 >= level.rounds) {
          // 当前关卡所有轮完成
          if (totalScoreRef.current >= level.targetScore) {
            if (levelIndex + 1 < GOOSE_LEVELS.length) {
              // 进入下一关
              sound.play('levelup');
              showBanner(`${level.title} 通过！进入下一关～`);
              await delay(800);
              setBanner(null);
              startLevel(levelIndex + 1, pool);
            } else {
              // 全部通关
              finish(true);
            }
          } else {
            // 未达到目标分
            finish(false);
          }
        } else {
          // 下一轮
          prepareRound(roundIndex + 1, levelIndex, pool);
        }
      } else {
        // 匹配错误
        sound.play('wrong');
        addMistake();
        mistakesRef.current += 1;
        const newMistakes = mistakesRef.current;
        setMistakesCount(newMistakes);

        setFlashCoord(tileIndex);
        await delay(400);
        setFlashCoord(null);

        if (newMistakes > level.mistakeLimit) {
          finish(false);
        }
      }

      busyRef.current = false;
    },
    [
      tiles,
      targetKey,
      roundIndex,
      level,
      levelIndex,
      pool,
      subject,
      sound,
      tts,
      addScore,
      collectKnowledge,
      addMistake,
      showBanner,
      prepareRound,
      startLevel,
      finish,
    ],
  );

  const renderTile = useCallback(
    (pos: { row: number; col: number }) => {
      const idx = pos.row * level.tilesPerRound + pos.col;
      if (idx >= tiles.length) return <div className="w-full aspect-square rounded-3xl bg-white/40" />;
      const tile = tiles[idx];
      const isFlashing = flashCoord === idx;
      const isWrongFlash = isFlashing && !isMatch(tile, targetKey);

      return (
        <Card
          key={`goose-${roundIndex}-${idx}`}
          emoji={tile.emoji}
          label={tile.label}
          sub={tile.sub}
          tone={tile.tone}
          matched={isFlashing && isMatch(tile, targetKey)}
          wrong={isWrongFlash}
          onClick={ended ? undefined : () => { void handleClick(idx); }}
          className={isFlashing ? 'animate-pop' : ''}
          disabled={ended}
        />
      );
    },
    [tiles, flashCoord, targetKey, roundIndex, ended, handleClick, level],
  );

  // 计算网格布局：单行排列
  const cols = Math.min(level.tilesPerRound, 4);
  const rows = Math.ceil(level.tilesPerRound / cols);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 关卡进度 */}
      <div className="text-center text-ink font-bold">
        {level.title} · 第 {roundIndex + 1}/{level.rounds} 轮 · 得分 {totalScore} · 失误 {mistakesCount}/{level.mistakeLimit}
      </div>

      {/* 进度条 */}
      <div className="w-full max-w-xs h-3 bg-white/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-mint rounded-full transition-all duration-300"
          style={{ width: `${Math.round(((roundIndex + 1) / level.rounds) * 100)}%` }}
        />
      </div>

      {/* 目标提示 */}
      {targetTile && (
        <div className="flex items-center gap-2 px-5 py-2 bg-white/60 rounded-3xl shadow-soft">
          <span className="text-xl">{targetTile.emoji}</span>
          <span className="text-lg font-bold text-ink">
            {subject === 'english'
              ? `找找类别相同的：${targetKey}`
              : `找找拼音一样的：${targetKey}`}
          </span>
        </div>
      )}

      {banner && (
        <div className="px-4 py-2 rounded-3xl bg-lemon shadow-soft text-ink font-bold animate-pop">
          {banner}
        </div>
      )}

      <GridBoard
        rows={rows}
        cols={cols}
        gap={2}
        ariaLabel={subject === 'english' ? 'Goose catch board' : '抓大鹅棋盘'}
        renderCell={renderTile}
      />

      <p className="text-inkSoft text-sm">
        {subject === 'english'
          ? '找到和目标类别相同的单词，点击它～'
          : '找到和目标拼音相同的字，点击它～'}
      </p>
    </div>
  );
}

export default GooseCatchGame;
