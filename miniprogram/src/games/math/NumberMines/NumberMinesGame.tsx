import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { GridBoard } from '../../../components/GridBoard';
import { Card, type CardTone } from '../../../components/Card';
import { useScore } from '../../../state/ScoreContext';
import { computeStars } from '../../../utils/gameLoop';
import {
  applyAnswer,
  buildBoard,
  isWin,
  makeOptions,
  MINES_LEVELS,
  type MinesBoard,
  type MinesLevel,
} from './numberMinesLogic';

/**
 * 数字扫雷（数学 subject）：算式生成 + 按雷数梯度布雷。
 * - 点隐藏格 → 触发该格 20 以内加减算式；答对 → 翻开（显示周围雷数提示）并收集算理知识点。
 * - 点中雷 → 踩雷揭示（失误），需避开；翻开全部安全格即过关。
 * 复用 GameShell 注入的 ScoreContext / GridBoard / Card，零新增依赖。
 */
export function NumberMinesGame({ config, sound, onComplete }: GameProps) {
  const {
    addScore,
    bumpCombo,
    resetCombo,
    addMistake,
    collectKnowledge,
    unlockMedal,
    scoreRef,
    mistakesRef,
    knowledgeRef,
    medalsRef,
  } = useScore();
  const seedRef = useRef<number>(Date.now());

  const [levelIndex, setLevelIndex] = useState(0);
  const [board, setBoard] = useState<MinesBoard>(() =>
    buildBoard(MINES_LEVELS[0], seedRef.current),
  );
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);

  const level: MinesLevel = MINES_LEVELS[levelIndex];

  const openedCount = useMemo(() => {
    let n = 0;
    for (const row of board.cells) for (const cell of row) if (!cell.isMine && cell.opened) n++;
    return n;
  }, [board]);

  const startLevel = useCallback(
    (idx: number) => {
      const lv = MINES_LEVELS[idx];
      setLevelIndex(idx);
      setBoard(buildBoard(lv, seedRef.current + idx * 211));
      setSelected(null);
      setOptions([]);
      setHint(null);
    },
    [],
  );

  const finish = useCallback(
    (passed: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setEnded(true);
      const durationMs = Date.now() - startRef.current;
      const stars = computeStars({ passed, mistakes: mistakesRef.current, durationMs });
      if (passed) unlockMedal(`clear:${config.id}`);
      onComplete({
        score: scoreRef.current,
        passed,
        stars,
        durationMs,
        knowledgePoints: knowledgeRef.current,
        medals: medalsRef.current,
      });
    },
    [onComplete, unlockMedal, config.id, mistakesRef, scoreRef, knowledgeRef, medalsRef],
  );

  const chooseCell = useCallback(
    (row: number, col: number) => {
      const cell = board.cells[row][col];
      if (cell.revealed) return; // 已翻开不可再点
      setHint(null);
      setSelected({ row, col });
      const optRng = (() => {
        let s = (seedRef.current + row * 131 + col * 17) >>> 0;
        return () => {
          s = (s * 1664525 + 1013904223) >>> 0;
          return s / 0xffffffff;
        };
      })();
      setOptions(makeOptions(cell.expr.answer, optRng));
      sound.play('click');
    },
    [board, sound],
  );

  const answer = useCallback(
    (value: number) => {
      if (!selected || endedRef.current) return;
      const { row, col } = selected;
      const cell = board.cells[row][col];
      const res = applyAnswer(board, row, col, value);

      if (res.correct) {
        setBoard(res.board);
        if (res.isMine) {
          // 踩中雷：失误但不直接结束，继续解其余安全格
          addMistake();
          resetCombo();
          sound.play('wrong');
          setSelected(null);
          setOptions([]);
          setHint(null);
        } else {
          addScore(10);
          bumpCombo();
          if (res.knowledgePoint) collectKnowledge(res.knowledgePoint);
          sound.play('correct');
          setSelected(null);
          setOptions([]);
          setHint(null);
        }
      } else {
        addMistake();
        resetCombo();
        sound.play('wrong');
        setBoard(res.board); // 记录 wrong 抖动
        setHint(cell.expr.hint ?? '再算一次～');
      }

      // 胜负判定（基于最新棋盘）
      if (isWin(res.board)) {
        if (levelIndex < MINES_LEVELS.length - 1) {
          sound.play('levelup');
          startLevel(levelIndex + 1);
        } else {
          finish(true);
        }
      }
    },
    [selected, board, addMistake, resetCombo, addScore, bumpCombo, collectKnowledge, sound, levelIndex, startLevel, finish],
  );

  useEffect(() => {
    sound.play('click');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderCellContent = (row: number, col: number) => {
    const cell = board.cells[row][col];
    const isSel = selected?.row === row && selected?.col === col;
    if (cell.revealed) {
      if (cell.steppedMine) {
        return (
          <Card
            key={`${row},${col}`}
            emoji="💣"
            tone="lemon"
            onClick={() => undefined}
            className="animate-shake"
          />
        );
      }
      const tone: CardTone = 'mint';
      return (
        <Card
          key={`${row},${col}`}
          label={String(cell.neighborMines)}
          tone={tone}
          onClick={() => undefined}
        />
      );
    }
    const tone: CardTone = isSel ? 'sky' : 'white';
    return (
      <Card
        key={`${row},${col}`}
        label="?"
        tone={tone}
        selected={isSel}
        wrong={cell.wrong}
        onClick={() => chooseCell(row, col)}
      />
    );
  };

  return (
    <View className="flex flex-col items-center gap-3">
      <View className="text-center text-ink font-bold">
        {level.title} · 已翻开安全格 {openedCount} / {board.safeTotal}
      </View>
      <Text className="text-inkSoft text-xs">点格子算出算式答案，避开 💣 翻开所有安全格！</Text>

      <GridBoard
        rows={level.rows}
        cols={level.cols}
        gap={2}
        ariaLabel="数字扫雷棋盘"
        renderCell={({ row, col }) => renderCellContent(row, col)}
      />

      {selected && options.length > 0 && (
        <View className="w-full max-w-sm flex flex-col items-center gap-2 rounded-4xl bg-white/70 shadow-soft p-4">
          <View className="text-ink font-bold text-lg">
            {board.cells[selected.row][selected.col].expr.text} = ?
          </View>
          <View className="grid grid-cols-4 gap-2 w-full">
            {options.map((o) => (
              <View
                key={o}
                type="button"
                onClick={() => answer(o)}
                className="flex items-center justify-center text-center rounded-3xl bg-mint shadow-soft font-bold text-ink py-3 active:scale-95 text-xl"
              >
                {o}
              </View>
            ))}
          </View>
          {hint && (
            <View className="text-sm text-ink bg-lemon rounded-3xl px-3 py-1 animate-pop">
              小提示：{hint}
            </View>
          )}
        </View>
      )}

      <Text className="text-inkSoft text-xs">
        算式答对即翻开，并收集算理知识点（进位加 / 退位减 / 连加连减）
      </Text>
    </View>
  );
}

export default NumberMinesGame;
