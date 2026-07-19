import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import { useRouter, navigateBack } from '@tarojs/taro';
import { SoundManager } from '../sound/SoundManager';
import { TtsManager } from '../sound/TtsManager';
import { ScoreProvider, useScore } from '../state/ScoreContext';
import { useProgress } from '../state/ProgressStore';
import type { GameConfig, GameResult } from './types';
import './ModuleGameRunner.css';

/**
 * 游戏内容组件 —— 必须在 ScoreProvider 内部渲染。
 *
 * 这里通过 useScore 读取分数/连击/知识点/勋章，与 Web 端 GameShell 行为对齐：
 * - 完成 onomplete 时合并运行期的 ScoreContext 快照；
 * - 调用 useProgress().saveResult 持久化进度；
 * - 「再玩一次」通过父级 key 重挂载实现彻底重置。
 */
function GameContent({
  config,
  sound,
  tts,
  onRestart,
  onComplete,
  onExit,
}: {
  config: GameConfig;
  sound: SoundManager;
  tts: TtsManager;
  onRestart: () => void;
  onComplete: (r: GameResult) => void;
  onExit: () => void;
}) {
  const { knowledgePoints, medals } = useScore();
  const { saveResult } = useProgress();

  const handleComplete = useCallback(
    (r: GameResult) => {
      const merged: GameResult = {
        ...r,
        knowledgePoints: r.knowledgePoints ?? knowledgePoints,
        medals: r.medals ?? medals,
      };
      sound.play(r.passed ? 'win' : 'wrong');
      saveResult({ ...merged, gameId: config.id });
      onComplete(merged);
    },
    [sound, saveResult, config.id, knowledgePoints, medals, onComplete],
  );

  const Component = config.component;
  return (
    <Component
      config={config}
      sound={sound}
      tts={tts}
      onComplete={handleComplete}
      onExit={onExit}
    />
  );
}

/**
 * 游戏路由分发组件 —— 各分包 page 复用。
 *
 * 设计：
 * - 分包 page 自行 import 该模块的 GameConfig[]（含 component），传入 `games` prop
 * - ModuleGameRunner 负责根据 gameId 取 GameConfig、创建 sound/tts 实例、
 *   用 ScoreProvider 包裹游戏组件（游戏内部通过 useScore 读写分数/连击）
 * - 卸载时 dispose sound/tts，避免 AudioContext 泄漏
 * - 退出走 Taro.navigateBack（小程序原生导航），不依赖 react-router
 *
 * 这样主包不会引用任何游戏组件代码，每个分包只引入本模块的游戏组件，
 * 实现真正的按模块分包加载。
 */
export interface ModuleGameRunnerProps {
  /** 该分包支持的游戏列表（含组件）。由分包 page import 后传入。 */
  games: GameConfig[];
}

export default function ModuleGameRunner({ games }: ModuleGameRunnerProps) {
  const router = useRouter();
  const gameId = router.params.gameId || '';
  const [result, setResult] = useState<GameResult | null>(null);
  // 用 state 持有实例：保证挂载后能触发一次重渲染，把实例注入子组件
  const [instances, setInstances] = useState<{
    sound: SoundManager;
    tts: TtsManager;
  } | null>(null);
  // 「再玩一次」时自增，作为 ScoreProvider key 强制重挂载彻底重置状态
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const sound = new SoundManager();
    const tts = new TtsManager();
    setInstances({ sound, tts });
    return () => {
      sound.dispose();
      tts.dispose();
    };
  }, []);

  const gameMap = useMemo(
    () => Object.fromEntries(games.map((g) => [g.id, g])) as Record<string, GameConfig>,
    [games],
  );

  const config = gameMap[gameId];

  const handleComplete = useCallback((r: GameResult) => {
    setResult(r);
  }, []);

  const handleExit = useCallback(() => {
    navigateBack();
  }, []);

  const handleRestart = useCallback(() => {
    setResult(null);
    setRunId((r) => r + 1);
  }, []);

  if (!config) {
    return (
      <View className="min-h-screen flex items-center justify-center bg-cream">
        <View className="text-center">
          <Text className="text-2xl text-ink font-bold">游戏不存在</Text>
          <Text className="block text-inkSoft mt-2">gameId: {gameId}</Text>
        </View>
      </View>
    );
  }

  if (result) {
    return (
      <View className="min-h-screen flex items-center justify-center bg-cream px-5">
        <View className="bg-white rounded-3xl shadow-soft p-8 max-w-md w-full text-center">
          <Text className="text-4xl">{result.stars >= 3 ? '🏆' : result.passed ? '✅' : '💪'}</Text>
          <Text className="block text-2xl font-bold text-ink mt-4">{config.title}</Text>
          <Text className="block text-inkSoft mt-2">得分：{result.score}</Text>
          <Text className="block text-inkSoft">用时：{(result.durationMs / 1000).toFixed(1)}秒</Text>
          <Text className="block text-inkSoft">星级：{'⭐'.repeat(result.stars)}</Text>
          {result.knowledgePoints && result.knowledgePoints.length > 0 && (
            <View className="mt-3">
              <Text className="block text-xs text-inkSoft mb-1">本局知识点</Text>
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
            <View className="mt-3">
              <Text className="block text-xs text-inkSoft mb-1">本局解锁勋章</Text>
              <View className="flex flex-wrap justify-center gap-1">
                {result.medals.map((m) => (
                  <Text
                    key={m}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700"
                  >
                    🏅 {m}
                  </Text>
                ))}
              </View>
            </View>
          )}
          <View className="mt-6 flex gap-2 justify-center">
            <View
              className="px-6 py-3 rounded-full bg-mint text-white font-bold"
              onClick={handleRestart}
            >
              <Text>再玩一次</Text>
            </View>
            <View
              className="px-6 py-3 rounded-full bg-cream text-ink font-bold"
              onClick={() => navigateBack()}
            >
              <Text>返回模块</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (!instances) {
    return null;
  }

  return (
    <View className="min-h-screen bg-cream">
      <View className="max-w-3xl mx-auto px-4 py-6">
        <View className="flex items-center mb-4">
          <Text className="text-2xl mr-2">{config.icon}</Text>
          <Text className="text-xl font-bold text-ink">{config.title}</Text>
        </View>
        {/* ScoreProvider 包裹游戏组件，游戏内部 useScore 才能正常工作 */}
        <ScoreProvider key={runId}>
          <GameContent
            config={config}
            sound={instances.sound}
            tts={instances.tts}
            onRestart={handleRestart}
            onComplete={handleComplete}
            onExit={handleExit}
          />
        </ScoreProvider>
      </View>
    </View>
  );
}
