import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
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
import { Spinner } from './Spinner';
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
      // 优先采用游戏 finish 时同步附带的知识点/勋章（避免运行期 reducer 闭包滞后导致漏存）；
      // 旧玩法若未附带，则回退到 GameShell 自身从 ScoreContext 读取的快照。
      const merged: GameResult = {
        ...r,
        knowledgePoints: r.knowledgePoints ?? knowledgePoints,
        medals: r.medals ?? medals,
      };
      setResult(merged);
      setFinished(true);
      sound.play(r.passed ? 'win' : 'wrong');
      saveResult({ ...merged, gameId: config.id });
    },
    [sound, saveResult, config.id, knowledgePoints, medals],
  );

  const handleExit = useCallback(() => {
    navigate(`/${config.module}`);
  }, [navigate, config.module]);

  const Component = config.component;

  return (
    <View className="min-h-screen flex flex-col" onPointerDown={handlePointerDown}>
      <HUD
        title={config.title}
        module={config.module}
        score={score}
        combo={combo}
        sound={sound}
        tts={tts}
        onExit={handleExit}
      />
      <View className="flex-1 px-3 pb-8 pt-3">
        <Suspense
          fallback={
            <View className="min-h-[50vh] flex items-center justify-center animate-fadeIn">
              <Spinner size={44} label="加载中…" />
            </View>
          }
        >
          <Component
            config={config}
            sound={sound}
            tts={tts}
            onComplete={handleComplete}
            onExit={handleExit}
          />
        </Suspense>
      </View>

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
          <View className="flex flex-col items-center gap-2">
            <StarRating value={result.stars} />
            <View className="text-lg font-bold text-ink">得分：{result.score}</View>
            <View className="text-sm">用时：{formatTime(result.durationMs)}</View>

            {result.knowledgePoints && result.knowledgePoints.length > 0 && (
              <View className="mt-1 w-full">
                <View className="mb-1 text-xs text-ink/60">本局知识点</View>
                <View className="flex flex-wrap justify-center gap-1">
                  {result.knowledgePoints.map((kp) => (
                    <Text
                      key={kp}
                      className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700"
                    >
                      {kp}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {result.medals && result.medals.length > 0 && (
              <View className="mt-1 w-full">
                <View className="mb-1 text-xs text-ink/60">本局解锁勋章</View>
                <View className="flex flex-wrap justify-center gap-1">
                  {result.medals.map((m) => (
                    <Text
                      key={m}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"
                    >
                      🏅 {m}
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </View>
        </Modal>
      )}
    </View>
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
