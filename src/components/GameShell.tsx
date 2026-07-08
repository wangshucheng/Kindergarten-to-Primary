import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameConfig, GameResult } from '../games/types';
import { SoundManager } from '../sound/SoundManager';
import { TtsManager } from '../sound/TtsManager';
import { ScoreProvider, useScore } from '../state/ScoreContext';
import { useProgress } from '../state/ProgressStore';
import { HUD } from './HUD';
import { Modal } from './Modal';
import { StarRating } from './StarRating';
import { Button } from './Button';
import { formatTime } from '../utils/gameLoop';

function GameInner({
  config,
  sound,
  tts,
  onRestart,
}: {
  config: GameConfig;
  sound: SoundManager;
  tts: TtsManager;
  onRestart: () => void;
}) {
  const navigate = useNavigate();
  const { score, combo, knowledgePoints, medals } = useScore();
  const { saveResult } = useProgress();

  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const resumedRef = useRef(false);

  // 首次交互解锁 AudioContext（浏览器自动播放策略）
  const handlePointerDown = useCallback(() => {
    if (!resumedRef.current) {
      sound.resume();
      resumedRef.current = true;
    }
  }, [sound]);

  const handleComplete = useCallback(
    (r: GameResult) => {
      setResult(r);
      setFinished(true);
      sound.play(r.passed ? 'win' : 'wrong');
      saveResult({ ...r, gameId: config.id, knowledgePoints, medals });
    },
    [sound, saveResult, config.id, knowledgePoints, medals],
  );

  const handleExit = useCallback(() => {
    navigate(`/${config.module}`);
  }, [navigate, config.module]);

  const Component = config.component;

  return (
    <div className="min-h-screen flex flex-col" onPointerDown={handlePointerDown}>
      <HUD
        title={config.title}
        module={config.module}
        score={score}
        combo={combo}
        sound={sound}
        tts={tts}
        onExit={handleExit}
      />
      <main className="flex-1 px-3 pb-8 pt-3">
        <Component
          config={config}
          sound={sound}
          tts={tts}
          onComplete={handleComplete}
          onExit={handleExit}
        />
      </main>

      {finished && result && (
        <Modal
          title={result.passed ? '太棒啦！' : '再试一次吧'}
          emoji={result.passed ? '🎉' : '💪'}
          actions={
            <>
              <Button variant="mint" size="lg" onClick={onRestart}>
                再玩一次
              </Button>
              <Button variant="ghost" size="lg" onClick={handleExit}>
                返回模块
              </Button>
            </>
          }
        >
          <div className="flex flex-col items-center gap-2">
            <StarRating value={result.stars} />
            <div className="text-lg font-bold text-ink">得分：{result.score}</div>
            <div className="text-sm">用时：{formatTime(result.durationMs)}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/**
 * GameShell —— 游戏外壳：
 * - 提供 SoundManager 与 TtsManager 实例及 ScoreProvider（运行期分数/连击）；
 * - 首次 pointer 事件解锁音频；
 * - 接收游戏 onComplete，统一落盘 localStorage 并弹出结算；
 * - 支持"再玩一次"（通过 key 重挂载实现彻底重置）；
 * - 组件卸载时自动清理 AudioContext 与 SpeechSynthesis，防止资源泄漏。
 */
export function GameShell({ config }: { config: GameConfig }) {
  const soundRef = useRef<SoundManager | null>(null);
  if (!soundRef.current) soundRef.current = new SoundManager();
  const sound = soundRef.current;

  const ttsRef = useRef<TtsManager | null>(null);
  if (!ttsRef.current) ttsRef.current = new TtsManager();
  const tts = ttsRef.current;

  const [runId, setRunId] = useState(0);

  // 组件卸载时清理音频/TTS 资源，防止泄漏
  useEffect(() => {
    return () => {
      sound.dispose();
      tts.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restart = useCallback(() => setRunId((r) => r + 1), []);

  return (
    <ScoreProvider key={runId}>
      <GameInner config={config} sound={sound} tts={tts} onRestart={restart} />
    </ScoreProvider>
  );
}
