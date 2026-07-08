import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../types';
import { Button } from '../../components/Button';
import { useScore } from '../../state/ScoreContext';
import { useTTS } from '../../sound/useTTS';
import { computeStars } from '../../utils/gameLoop';
import {
  ALL_SHAPES,
  ANGLE_INFO,
  makeAngleQuestion,
  makeCountCubesQuestion,
  makeRecognizeQuestion,
  makeSymmetryQuestion,
  type AngleQuestion,
  type CubeStackQuestion,
  type RecognizeQuestion,
  type ShapeId,
  type SymmetryQuestion,
} from './geometryLogic';

type Mode = 'recognize' | 'count' | 'symmetry' | 'angle';

const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'recognize', label: '认图形', icon: '🔍' },
  { key: 'count', label: '数方块', icon: '🧊' },
  { key: 'symmetry', label: '找对称', icon: '🦋' },
  { key: 'angle', label: '角分类', icon: '📐' },
];

const TOTAL_QUESTIONS = 8;
const ADVANCE_DELAY_MS = 850;

/**
 * 图形与几何主组件：顶部模式菜单 + 四种玩法。
 * 每种玩法均为练习类（有题目、计分），结束后调用 onComplete 上报。
 * 错误反馈不使用红色魔法色，而是 bg-white/50 opacity-50 animate-shake。
 */
export function GeometryGame({ sound, tts: ttsManager, onComplete }: GameProps) {
  const tts = useTTS(ttsManager);
  const { addScore, bumpCombo, addMistake, mistakes, combo, score } = useScore();
  const [mode, setMode] = useState<Mode>('recognize');

  useEffect(() => {
    tts.speakZh('图形与几何来啦，点一点就能听～');
    return () => tts.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback(
    (durationMs: number) => {
      const stars = computeStars({ passed: true, mistakes, durationMs });
      onComplete({ score, passed: true, stars, durationMs });
    },
    [mistakes, score, onComplete],
  );

  // ---------------- 渲染：模式菜单 ----------------
  const menu = (
    <div className="grid grid-cols-2 gap-3 w-full max-w-md">
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => setMode(m.key)}
          className="flex flex-col items-center gap-1 py-5 rounded-3xl bg-sky text-ink font-bold shadow-press active:scale-95 transition-transform"
        >
          <span className="text-3xl">{m.icon}</span>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );

  if (mode === 'recognize') {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        {menu}
        <RecognizeMode
          sound={sound}
          tts={tts}
          addScore={addScore}
          bumpCombo={bumpCombo}
          addMistake={addMistake}
          combo={combo}
          score={score}
          mistakes={mistakes}
          onFinish={finish}
        />
      </div>
    );
  }

  // 其余模式：先展示菜单作为顶部导航，便于切回
  const header = (
    <div className="flex flex-wrap justify-center gap-2 w-full max-w-md">
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => setMode(m.key)}
          className={[
            'px-3 py-2 rounded-2xl font-bold text-sm transition-all active:scale-95',
            mode === m.key ? 'bg-sky text-ink shadow-press' : 'bg-white/60 text-inkSoft',
          ].join(' ')}
        >
          {m.icon} {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {header}
      {mode === 'count' && (
        <CountMode
          sound={sound}
          tts={tts}
          addScore={addScore}
          bumpCombo={bumpCombo}
          addMistake={addMistake}
          combo={combo}
          score={score}
          mistakes={mistakes}
          onFinish={finish}
        />
      )}
      {mode === 'symmetry' && (
        <SymmetryMode
          sound={sound}
          tts={tts}
          addScore={addScore}
          bumpCombo={bumpCombo}
          addMistake={addMistake}
          combo={combo}
          score={score}
          mistakes={mistakes}
          onFinish={finish}
        />
      )}
      {mode === 'angle' && (
        <AngleMode
          sound={sound}
          tts={tts}
          addScore={addScore}
          bumpCombo={bumpCombo}
          addMistake={addMistake}
          combo={combo}
          score={score}
          mistakes={mistakes}
          onFinish={finish}
        />
      )}
    </div>
  );
}

export default GeometryGame;

// ===========================================================================
// 通用题型运行器（由各个模式复用）
// ===========================================================================

interface ModeDeps {
  sound: GameProps['sound'];
  tts: ReturnType<typeof useTTS>;
  addScore: (n: number) => void;
  bumpCombo: () => void;
  addMistake: () => void;
  combo: number;
  score: number;
  mistakes: number;
  onFinish: (durationMs: number) => void;
}

/** 计分项：每答对一题加分并连击；答错标记可重试 */
function useQuestionRunner(deps: ModeDeps, total: number) {
  const { addScore, bumpCombo, addMistake, combo, onFinish } = deps;
  const [idx, setIdx] = useState(1);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState(false);
  const startRef = useRef<number>(Date.now());
  const endedRef = useRef<boolean>(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const next = useCallback(() => {
    if (idx >= total) {
      if (!endedRef.current) {
        endedRef.current = true;
        onFinish(Date.now() - startRef.current);
      }
      return;
    }
    setIdx((i) => i + 1);
    setWrong(new Set());
    setLocked(false);
  }, [idx, total, onFinish]);

  const handle = useCallback(
    (chosen: string, answer: string, speak: string, after?: () => void) => {
      if (locked) return;
      if (chosen === answer) {
        deps.sound.play('correct');
        deps.tts.speakZh(speak);
        addScore(10 + Math.min(combo, 5) * 2);
        bumpCombo();
        setLocked(true);
        timer.current = setTimeout(() => {
          after?.();
          next();
        }, ADVANCE_DELAY_MS);
      } else {
        deps.sound.play('wrong');
        addMistake();
        setWrong((prev) => {
          const n = new Set(prev);
          n.add(chosen);
          return n;
        });
      }
    },
    [locked, deps, combo, addScore, bumpCombo, addMistake, next],
  );

  return { idx, wrong, locked, handle, next };
}

// ===========================================================================
// 模式一：认图形
// ===========================================================================

function RecognizeMode(deps: ModeDeps) {
  const [q, setQ] = useState<RecognizeQuestion>(() => makeRecognizeQuestion());
  const { idx, wrong, locked, handle } = useQuestionRunner(deps, TOTAL_QUESTIONS);

  const regen = useCallback(() => setQ(makeRecognizeQuestion()), []);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      <Hud idx={idx} score={deps.score} />
      <div className="w-full rounded-4xl bg-cream shadow-soft p-6 flex flex-col items-center gap-3">
        <div className="text-inkSoft text-sm">认一认</div>
        <ShapeView shapeId={q.shapeId} size={130} />
        <button
          onClick={() => deps.tts.speakZh(q.prompt)}
          className="text-2xl font-bold text-ink font-round"
        >
          {q.prompt}
        </button>
        <Button variant="ghost" size="sm" onClick={() => deps.tts.speakZh(q.prompt)}>
          🔊 听题目
        </Button>
      </div>
      <OptionGrid
        options={q.options}
        wrong={wrong}
        locked={locked}
        onPick={(opt) => handle(opt, q.answer, q.shapeName, regen)}
      />
    </div>
  );
}

// ===========================================================================
// 模式二：数方块
// ===========================================================================

function CountMode(deps: ModeDeps) {
  const [q, setQ] = useState<CubeStackQuestion>(() => makeCountCubesQuestion());
  const { idx, wrong, locked, handle } = useQuestionRunner(deps, TOTAL_QUESTIONS);
  const regen = useCallback(() => setQ(makeCountCubesQuestion()), []);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      <Hud idx={idx} score={deps.score} />
      <div className="w-full rounded-4xl bg-cream shadow-soft p-6 flex flex-col items-center gap-3">
        <div className="text-inkSoft text-sm">数一数，一共有几个正方体？</div>
        <CubeStackView columns={q.columns} />
      </div>
      <OptionGrid
        options={q.options.map(String)}
        wrong={wrong}
        locked={locked}
        onPick={(opt) => handle(opt, String(q.answer), `一共 ${q.answer} 个`, regen)}
      />
    </div>
  );
}

// ===========================================================================
// 模式三：找对称
// ===========================================================================

function SymmetryMode(deps: ModeDeps) {
  const [q, setQ] = useState<SymmetryQuestion>(() => makeSymmetryQuestion());
  const { idx, wrong, locked, handle } = useQuestionRunner(deps, TOTAL_QUESTIONS);
  const regen = useCallback(() => setQ(makeSymmetryQuestion()), []);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      <Hud idx={idx} score={deps.score} />
      <div className="w-full rounded-4xl bg-cream shadow-soft p-6 flex flex-col items-center gap-3">
        <div className="text-inkSoft text-sm">看一看</div>
        <ShapeView shapeId={q.shapeId} size={130} mirror />
        <button
          onClick={() => deps.tts.speakZh(q.prompt)}
          className="text-2xl font-bold text-ink font-round"
        >
          {q.prompt}
        </button>
      </div>
      <OptionGrid
        options={q.options}
        wrong={wrong}
        locked={locked}
        onPick={(opt) => handle(opt, q.answer, opt === '是' ? '对称' : '不对称', regen)}
      />
    </div>
  );
}

// ===========================================================================
// 模式四：角分类
// ===========================================================================

function AngleMode(deps: ModeDeps) {
  const [q, setQ] = useState<AngleQuestion>(() => makeAngleQuestion());
  const { idx, wrong, locked, handle } = useQuestionRunner(deps, TOTAL_QUESTIONS);
  const regen = useCallback(() => setQ(makeAngleQuestion()), []);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      <Hud idx={idx} score={deps.score} />
      <div className="w-full rounded-4xl bg-cream shadow-soft p-6 flex flex-col items-center gap-3">
        <div className="text-inkSoft text-sm">分一分</div>
        <AngleView kind={q.kind} size={130} />
        <button
          onClick={() => deps.tts.speakZh(q.prompt)}
          className="text-2xl font-bold text-ink font-round"
        >
          {q.prompt}
        </button>
      </div>
      <OptionGrid
        options={q.options}
        wrong={wrong}
        locked={locked}
        onPick={(opt) => handle(opt, q.answer, opt, regen)}
      />
    </div>
  );
}

// ===========================================================================
// 共享小组件
// ===========================================================================

function Hud({ idx, score }: { idx: number; score: number }) {
  return (
    <div className="flex w-full items-center justify-between text-ink font-bold">
      <span>
        第 {idx} / {TOTAL_QUESTIONS} 题
      </span>
      <span>⭐ {score}</span>
    </div>
  );
}

function OptionGrid({
  options,
  wrong,
  locked,
  onPick,
}: {
  options: string[];
  wrong: Set<string>;
  locked: boolean;
  onPick: (opt: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {options.map((opt) => {
        const isWrong = wrong.has(opt);
        const base = 'w-full py-5 rounded-3xl font-bold text-2xl text-ink shadow-press';
        const cls = isWrong
          ? 'bg-white/50 opacity-50 animate-shake'
          : 'bg-mint active:scale-95 transition-transform';
        return (
          <button
            key={opt}
            disabled={locked || isWrong}
            onClick={() => onPick(opt)}
            className={[base, cls].join(' ')}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 形状 SVG 绘制（纯展示，无业务逻辑）
// ---------------------------------------------------------------------------

function ShapeView({ shapeId, size = 120, mirror = false }: { shapeId: ShapeId; size?: number; mirror?: boolean }) {
  const stroke = '#6B5544';
  const fill = '#A0D2FF';
  const common = { fill, stroke, strokeWidth: 4, strokeLinejoin: 'round' as const };

  let body: JSX.Element;
  switch (shapeId) {
    case 'rectangle':
      body = <rect x={20} y={45} width={80} height={50} {...common} />;
      break;
    case 'square':
      body = <rect x={30} y={35} width={60} height={60} {...common} />;
      break;
    case 'triangle':
      body = <polygon points="50,25 90,95 10,95" {...common} />;
      break;
    case 'circle':
      body = <circle cx={50} cy={50} r={40} {...common} />;
      break;
    case 'parallelogram':
      body = <polygon points="30,40 85,40 70,90 15,90" {...common} />;
      break;
    case 'cuboid':
      body = (
        <g {...common}>
          <polygon points="25,40 60,25 90,40 55,55" />
          <polygon points="25,40 55,55 55,90 25,75" />
          <polygon points="55,55 90,40 90,75 55,90" />
        </g>
      );
      break;
    case 'cube':
      body = (
        <g {...common}>
          <polygon points="35,40 60,28 85,40 60,52" />
          <polygon points="35,40 60,52 60,80 35,68" />
          <polygon points="60,52 85,40 85,68 60,80" />
        </g>
      );
      break;
    case 'cylinder':
      body = (
        <g {...common}>
          <ellipse cx={50} cy={35} rx={30} ry={10} />
          <path d="M20,35 L20,80 A30,10 0 0 0 80,80 L80,35" fill={fill} />
          <ellipse cx={50} cy={80} rx={30} ry={10} fill="#FFF9F0" />
        </g>
      );
      break;
    case 'sphere':
      body = (
        <g>
          <circle cx={50} cy={50} r={38} {...common} />
          <ellipse cx={40} cy={40} rx={12} ry={8} fill="#FFFFFF" opacity={0.5} />
        </g>
      );
      break;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img">
      {body}
      {mirror && (
        <line x1={50} y1={8} x2={50} y2={92} stroke="#9C8775" strokeWidth={2} strokeDasharray="4 4" />
      )}
    </svg>
  );
}

function CubeStackView({ columns }: { columns: number[] }) {
  const cell = 30;
  const gap = 4;
  const maxH = Math.max(...columns);
  const width = columns.length * (cell + gap);
  const height = maxH * (cell + gap);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img">
      {columns.map((h, ci) => {
        const x = ci * (cell + gap);
        return Array.from({ length: h }).map((_, ri) => {
          const y = height - (ri + 1) * (cell + gap);
          return (
            <rect
              key={`${ci}-${ri}`}
              x={x}
              y={y}
              width={cell}
              height={cell}
              rx={4}
              fill="#A0D2FF"
              stroke="#6B5544"
              strokeWidth={2}
            />
          );
        });
      })}
    </svg>
  );
}

function AngleView({ kind, size = 120 }: { kind: keyof typeof ANGLE_INFO; size?: number }) {
  const stroke = '#6B5544';
  const deg = ANGLE_INFO[kind].degrees;
  // 顶点在左下，水平射线向右，另一条按角度旋转
  const cx = 25;
  const cy = 85;
  const len = 55;
  const rad = (deg * Math.PI) / 180;
  const x2 = cx + len * Math.cos(rad);
  const y2 = cy - len * Math.sin(rad);
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" role="img">
      <line x1={cx} y1={cy} x2={cx + len} y2={cy} stroke={stroke} strokeWidth={5} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={stroke} strokeWidth={5} strokeLinecap="round" />
      {kind === 'right' && (
        <polyline points={`${cx + 12},${cy} ${cx + 12},${cy - 12} ${cx},${cy - 12}`} fill="none" stroke={stroke} strokeWidth={3} />
      )}
    </svg>
  );
}
