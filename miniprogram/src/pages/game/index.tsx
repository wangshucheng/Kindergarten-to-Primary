import { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import './index.css';

/**
 * 游戏页（重构版）
 *
 * 放弃 @web alias 引用 Web 端源码的策略（导致 #327 错误，多 React 实例冲突），
 * 改为小程序内独立实现。先用一个简单的占位游戏验证基础链路：
 * - Taro + React hooks 可正常渲染
 * - Tailwind 类名可正常工作
 * - 路由参数可正常读取
 *
 * 后续每个 P0 游戏单独迁移时，参考其 Web 端逻辑用 Taro 原生组件重写。
 */

const GAME_TITLES: Record<string, string> = {
  'listen-pick': '听音选拼音',
  'pinyin-match': '拼读匹配',
  'pinyin-variants': '拼音变体',
  'flip-memory': '翻牌记忆',
  'connect-match': '连线匹配',
  'more-hanzi': '趣味识字',
};

export default function Game() {
  const router = useRouter();
  const gameId = router.params.gameId || '';
  const module = router.params.module || '';
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);

  useEffect(() => {
    // 简单的挂载验证
    console.log('[Game] mounted', { gameId, module });
  }, [gameId, module]);

  const title = GAME_TITLES[gameId] || '游戏';

  const handleClick = () => {
    setScore((s) => s + 1);
    if (score + 1 >= 5) {
      setRound((r) => r + 1);
      setScore(0);
    }
  };

  return (
    <View className="min-h-screen px-5 pt-10 pb-12 max-w-3xl mx-auto bg-cream">
      <View className="text-center mb-8 animate-fadeIn">
        <Text className="text-3xl font-bold text-ink">{title}</Text>
        <Text className="block text-inkSoft text-sm mt-2">
          gameId: {gameId} · module: {module}
        </Text>
      </View>

      <View className="bg-white rounded-3xl shadow-soft p-6 mb-6">
        <Text className="text-ink font-bold text-base">基础链路验证</Text>
        <View className="mt-3 flex flex-col gap-2">
          <Text className="text-sm text-inkSoft">✅ Taro + React 已挂载</Text>
          <Text className="text-sm text-inkSoft">✅ Tailwind 样式已应用</Text>
          <Text className="text-sm text-inkSoft">✅ 路由参数已读取</Text>
        </View>
      </View>

      <View className="bg-white rounded-3xl shadow-soft p-6 mb-6">
        <View className="flex items-center justify-between mb-4">
          <Text className="text-ink font-bold">第 {round} 轮</Text>
          <Text className="text-inkSoft text-sm">得分：{score}</Text>
        </View>
        <View
          className="mx-auto px-6 py-4 rounded-full bg-mint text-white font-bold shadow-press text-center"
          onClick={handleClick}
        >
          <Text>点击 +1（达到 5 进入下一轮）</Text>
        </View>
      </View>

      <View className="text-center">
        <Text className="text-xs text-inkSoft">
          后续将逐个迁移 P0 游戏，用 Taro 原生组件重写
        </Text>
      </View>
    </View>
  );
}
