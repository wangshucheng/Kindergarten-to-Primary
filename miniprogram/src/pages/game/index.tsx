import { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import type { GameProps } from '@web/games/types';
import type { SoundManager } from '@web/sound/SoundManager';
import type { TtsManager } from '@web/sound/TtsManager';
import { ScoreProvider } from '@web/state/ScoreContext';
import { SoundManager as SoundManagerImpl } from '@web/sound/SoundManager';
import { TtsManager as TtsManagerImpl } from '@web/sound/TtsManager';
import { setCloudAudioBaseUrl } from '../platform/tts';
import './index.css';

// 预加载 6 个 P0 游戏（直接引用 Web 端源码，零拷贝）
import { ListenPickGame } from '@web/games/pinyin/ListenPick/ListenPickGame';
import { PinyinMatchGame } from '@web/games/pinyin/PinyinMatch/PinyinMatchGame';
import { PinyinVariantsGame } from '@web/games/pinyin/PinyinVariants/PinyinVariantsGame';
import { FlipMemoryGame } from '@web/games/hanzi/FlipMemory/FlipMemoryGame';
import { ConnectMatchGame } from '@web/games/hanzi/ConnectMatch/ConnectMatchGame';
import { MoreHanziGame } from '@web/games/hanzi/MoreHanzi/MoreHanziGame';

// P0 游戏注册表：gameId → 组件
const P0_GAMES: Record<string, React.ComponentType<GameProps>> = {
  'listen-pick': ListenPickGame,
  'pinyin-match': PinyinMatchGame,
  'pinyin-variants': PinyinVariantsGame,
  'flip-memory': FlipMemoryGame,
  'connect-match': ConnectMatchGame,
  'more-hanzi': MoreHanziGame,
};

// 配置云存储音频 URL（实际部署时替换为真实地址）
// setCloudAudioBaseUrl('https://your-cdn.com/audio/words/');

/**
 * 游戏页：根据路由参数加载 P0 优先级游戏。
 *
 * 路由：/pages/game/index?gameId=listen-pick&module=pinyin
 *
 * 迁移要点：
 * 1. 直接 import Web 端游戏组件（通过 @web alias）
 * 2. 注入 SoundManager / TtsManager 实例（platform 抽象层自动适配小程序环境）
 * 3. 用 ScoreProvider 包裹（游戏内部用 useScore 读写分数）
 */
export default function Game() {
  const router = useRouter();
  const gameId = router.params.gameId || '';
  const module = router.params.module || '';
  const [sound] = useState<SoundManager>(() => new SoundManagerImpl());
  const [tts] = useState<TtsManager>(() => new TtsManagerImpl());
  const [result, setResult] = useState<{ stars: number; durationMs: number } | null>(null);

  useEffect(() => {
    return () => {
      sound.dispose();
      tts.dispose();
    };
  }, [sound, tts]);

  const GameComponent = P0_GAMES[gameId];

  if (!GameComponent) {
    return (
      <View className="min-h-screen px-5 pt-10 pb-12 max-w-3xl mx-auto bg-cream">
        <View className="text-center">
          <Text className="text-xl font-bold text-ink">游戏未找到</Text>
          <Text className="block text-sm text-inkSoft mt-4">
            gameId: {gameId}（module: {module}）
          </Text>
          <Text className="block text-sm text-inkSoft mt-2">
            可用游戏：{Object.keys(P0_GAMES).join(', ')}
          </Text>
        </View>
      </View>
    );
  }

  if (result) {
    return (
      <View className="min-h-screen px-5 pt-10 pb-12 max-w-3xl mx-auto bg-cream">
        <View className="text-center">
          <Text className="text-2xl font-bold text-ink">
            🎉 完成！获得 {result.stars} ⭐
          </Text>
          <Text className="block text-sm text-inkSoft mt-4">
            用时：{(result.durationMs / 1000).toFixed(1)} 秒
          </Text>
        </View>
      </View>
    );
  }

  const gameProps: GameProps = {
    config: {
      id: gameId,
      module: module as 'math' | 'pinyin' | 'hanzi' | 'english' | 'poetry' | 'geometry',
      title: gameId,
      icon: '🎮',
      priority: 'P0',
      component: GameComponent,
    },
    sound: sound as unknown as SoundManager,
    tts: tts as unknown as TtsManager,
    onComplete: (r) => {
      setResult({ stars: r.stars, durationMs: r.durationMs });
    },
    onExit: () => {
      // 实际项目中跳转回模块页
      setResult({ stars: 0, durationMs: 0 });
    },
  };

  return (
    <ScoreProvider>
      <View className="min-h-screen px-5 pt-10 pb-12 max-w-3xl mx-auto bg-cream">
        <GameComponent {...gameProps} />
      </View>
    </ScoreProvider>
  );
}
