import { View, Text } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import './index.css';

/**
 * 游戏页 - 加载具体游戏组件。
 *
 * 迁移策略：
 *   - 从 Web 版 GamePage.tsx 复制
 *   - 懒加载改为 Taro 的分包加载
 *   - 游戏组件本身（如 MakeTenGame）直接复用，无需改动
 *     （platform 抽象层已处理 storage/tts/audio 差异）
 */
export default function Game() {
  const router = useRouter();
  const module = router.params.module || '';
  const gameId = router.params.gameId || '';

  return (
    <View className="min-h-screen px-5 pt-10 pb-12 max-w-3xl mx-auto bg-cream">
      <View className="text-center">
        <Text className="text-xl font-bold text-ink">
          游戏加载中：{module}/{gameId}
        </Text>
        <Text className="block text-sm text-inkSoft mt-4">
          实际迁移时在此动态加载对应游戏组件。
          参考 MINIPROGRAM_MIGRATION.md 的「游戏迁移清单」章节。
        </Text>
      </View>
    </View>
  );
}
