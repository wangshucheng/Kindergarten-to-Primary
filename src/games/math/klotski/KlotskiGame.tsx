import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { Card, type CardTone } from '../../../components/Card';
import { useScore } from '../../../state/ScoreContext';
import { useTTS } from '../../../sound/useTTS';
import { computeStars } from '../../../utils/gameLoop';
import {
  applyMove,
  buildLevel,
  checkClassify,
  checkPattern,
  checkSort,
  isSolved,
  KLOTSKI_LEVELS,
  movableDirs,
  type Dir,
  type KlotskiLevelData,
  type KlotskiState,
} from './klotskiLogic';

type Phase = 'question' | 'slide' | 'done';

/**
 * 华容道（数学 subject）：滑块拼图变体。
 * 每关先嵌入一道「排序 / 分类 / 规律」小题（门控，答对才进入滑动），
 * 答对收集对应 logic 知识点；随后把 2×2 目标块滑到出口即过关。
 * 复用 GameShell 注入的 ScoreContext / TTS，以及共享 Card / computeStars。
 */
export function KlotskiGame({ config, sound, tts: ttsManager, onComplete }: GameProps) {
  const {
    addScore,
    bumpCombo,
    collectKnowledge,
    addMistake,
    unlockMedal,
    mistakesRef,
    scoreRef,
    knowledgeRef,
    medalsRef,
  } = useScore();
  const tts = useTTS(ttsManager);
  const seedRef = useRef<number>(Date.now());

  const buildFor = useCallback(
    (idx: number): KlotskiLevelData =>
      buildLevel(KLOTSKI_LEVELS[idx], (seedRef.current + idx * 101) >>> 0),
    [],
  );

  const [levelIndex, setLevelIndex] = useState(0);
  const [data, setData] = useState<KlotskiLevelData>(() => buildFor(0));
  const [board, setBoard] = useState<KlotskiState>(data.state);
  const [phase, setPhase] = useState<Phase>('question');

  // 小题作答态
  const [order, setOrder] = useState<string[]>([]);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [patternChoice, setPatternChoice] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [moves, setMoves] = useState(0);
  const [ended, setEnded] = useState(false);

  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);
  const movesRef = useRef<number>(0);
  const levelRef = useRef<number>(0);

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

  const advanceLevel = useCallback(
    (idx: number) => {
      const d = buildFor(idx);
      setLevelIndex(idx);
      levelRef.current = idx;
      setData(d);
      setBoard(d.state);
      setPhase('question');
      setOrder([]);
      setAssign({});
      setPatternChoice(null);
      setHint(null);
      setMoves(0);
      movesRef.current = 0;
      setEnded(false);
      endedRef.current = false;
      startRef.current = Date.now();
    },
    [buildFor],
  );

  useEffect(() => {
    const kind = data.kind;
    if (kind === 'sort') tts.speakZh('把卡片按从小到大排好，点一点它们的顺序！');
    else if (kind === 'classify') tts.speakZh('把卡片分到对应的类别里！');
    else tts.speakZh('找出规律里缺了的那一个！');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const submitQuestion = useCallback(() => {
    const p = data.puzzle;
    let ok = false;
    if (p.kind === 'sort') ok = checkSort(p, order);
    else if (p.kind === 'classify') {
      const groupMap = Object.fromEntries(
        Object.entries(assign).map(([k, v]) => [k, [v]]),
      );
      ok = checkClassify(p, groupMap);
    }
    else if (p.kind === 'pattern') ok = checkPattern(p, patternChoice ?? '');
    if (ok) {
      sound.play('correct');
      collectKnowledge(data.knowledgePoint);
      setPhase('slide');
    } else {
      sound.play('wrong');
      addMistake();
      setHint('再试一次～');
    }
  }, [data, order, assign, patternChoice, sound, collectKnowledge, addMistake]);

  // 滑动：点击方块 → 在其可移动方向中选“最接近出口”的方向移动
  const bestDir = (state: KlotskiState, blockId: string): Dir | null => {
    const dirs = movableDirs(state, blockId);
    if (dirs.length === 0) return null;
    const b = state.blocks.find((x) => x.id === blockId)!;
    const dist = (d: Dir) => {
      const dd = d === 'up' ? -1 : d === 'down' ? 1 : 0;
      const dc = d === 'left' ? -1 : d === 'right' ? 1 : 0;
      const nr = b.r + dd;
      const nc = b.c + dc;
      return Math.abs(nr - state.goalTarget.r) + Math.abs(nc - state.goalTarget.c);
    };
    return dirs.reduce((best, d) => (dist(d) < dist(best) ? d : best), dirs[0]);
  };

  const onBlockClick = useCallback(
    (pos: { row: number; col: number }) => {
      if (phase !== 'slide' || endedRef.current) return;
      const b = board.blocks.find(
        (x) => pos.row >= x.r && pos.row < x.r + x.h && pos.col >= x.c && pos.col < x.c + x.w,
      );
      if (!b) return;
      const d = bestDir(board, b.id);
      if (!d) {
        // 该方块无法移动（无相邻空格）→ 视为一次失误（M6）
        sound.play('wrong');
        addMistake();
        return;
      }
      // L4：复用 logic 层 applyMove 完成合法滑动，避免与 logic 重复实现漂移
      const next = applyMove(board, b.id, d);
      setBoard(next);
      movesRef.current += 1;
      setMoves(movesRef.current);
      sound.play('click');

      if (isSolved(next)) {
        addScore(10);
        bumpCombo();
        if (levelIndex < KLOTSKI_LEVELS.length - 1) {
          sound.play('levelup');
          advanceLevel(levelIndex + 1);
        } else {
          finish(true);
        }
        return;
      }

      // 步数上限检查（否则玩家卡死后无反馈）
      if (movesRef.current >= level.moveLimit) {
        finish(false);
      }
    },
    [phase, board, ended, sound, addScore, bumpCombo, addMistake, levelIndex, advanceLevel, finish],
  );

  // ---------------- 小题 UI ----------------

  const renderQuestion = () => {
    const p = data.puzzle;
    if (p.kind === 'sort') {
      return (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="text-ink font-bold">按从小到大排好顺序，点一点卡片 👇</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {p.items.map((it) => (
              <Card
                key={it.id}
                label={it.label}
                tone="sky"
                selected={order.includes(it.id)}
                onClick={() => setOrder((o) => (o.includes(it.id) ? o : [...o, it.id]))}
              />
            ))}
          </div>
          <div className="text-inkSoft text-sm">
            你的顺序：{order.map((id) => p.items.find((x) => x.id === id)?.label).join(' → ') || '（空）'}
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-3xl bg-mint shadow-soft text-ink font-bold"
            onClick={submitQuestion}
          >
            提交
          </button>
        </div>
      );
    }
    if (p.kind === 'classify') {
      const groups = Object.keys((p.target as { groups: Record<string, string[]> }).groups);
      const cycle = (id: string) => {
        const cur = assign[id];
        const idx = cur ? groups.indexOf(cur) : -1;
        const nextKey = groups[(idx + 1) % groups.length];
        setAssign((a) => ({ ...a, [id]: nextKey }));
      };
      return (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="text-ink font-bold">把卡片分到对应类别（点卡片切换类别）👇</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {p.items.map((it) => (
              <Card
                key={it.id}
                label={it.label}
                sub={assign[it.id] ?? '?'}
                tone="lemon"
                onClick={() => cycle(it.id)}
              />
            ))}
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-3xl bg-mint shadow-soft text-ink font-bold"
            onClick={submitQuestion}
          >
            提交
          </button>
        </div>
      );
    }
    // pattern
    const t = p.target as { options: string[] };
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        <div className="text-ink font-bold">找出规律里缺了的那一个 👇</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {p.items.map((it, i) => (
            <Card key={i} label={it.label} tone={it.label === '?' ? 'cream' : 'sky'} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {t.options.map((opt) => (
            <Card
              key={opt}
              label={opt}
              tone={patternChoice === opt ? 'mint' : 'white'}
              selected={patternChoice === opt}
              onClick={() => {
                setPatternChoice(opt);
                setHint(null);
              }}
            />
          ))}
        </div>
        <button
          type="button"
          className="px-4 py-2 rounded-3xl bg-mint shadow-soft text-ink font-bold"
          onClick={() => {
            if (patternChoice == null) {
              setHint('先选一个答案～');
              return;
            }
            submitQuestion();
          }}
        >
          提交
        </button>
      </div>
    );
  };

  const level = KLOTSKI_LEVELS[levelIndex];

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="text-center text-ink font-bold">
        {level.title} · {phase === 'question' ? '先答小题' : `${moves}/${level.moveLimit} 步`}
      </div>

      {hint && <div className="px-4 py-2 rounded-3xl bg-lemon shadow-soft text-ink font-bold">{hint}</div>}

      {phase === 'question' ? (
        renderQuestion()
      ) : (
        <>
          <p className="text-inkSoft text-xs">点方块，把它滑到空格里，把 🚪 送到出口就过关！</p>
          <div
            className="w-full"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${board.rows}, minmax(0, 1fr))`,
              gap: '0.3rem',
              aspectRatio: `${board.cols} / ${board.rows}`,
            }}
          >
            {board.blocks.map((b) => {
              const tone: CardTone = b.isGoal ? 'mint' : 'peach';
              const atGoal = b.isGoal && b.r === board.goalTarget.r && b.c === board.goalTarget.c;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onBlockClick({ row: b.r, col: b.c })}
                  style={{
                    gridColumn: `${b.c + 1} / span ${b.w}`,
                    gridRow: `${b.r + 1} / span ${b.h}`,
                  }}
                  className={[
                    'flex items-center justify-center rounded-3xl font-round text-ink select-none',
                    'shadow-soft active:scale-95 transition-all',
                    tone === 'mint' ? 'bg-mint' : 'bg-peach',
                    atGoal ? 'ring-4 ring-white' : '',
                  ].join(' ')}
                >
                  <span className="text-2xl leading-none">{b.label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-3xl bg-lemon shadow-soft text-ink font-bold text-sm"
            onClick={() => advanceLevel(levelIndex)}
          >
            🔄 重试本关
          </button>
        </>
      )}

      <p className="text-inkSoft text-xs">
        {data.kind === 'sort'
          ? '排序推理'
          : data.kind === 'classify'
            ? '分类推理'
            : '规律推理'}{' '}
        · 答对小题即可收集对应知识点～
      </p>
    </div>
  );
}

export default KlotskiGame;
