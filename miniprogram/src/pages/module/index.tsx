import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import config from '../../data/config.json';
import { getGameMetasByModule } from '../../games/gameMetas';
import type { ModuleKey } from '../../games/types';
import './index.css';

type ModuleMeta = {
  key: string;
  title: string;
  icon: string;
  description?: string;
};

/**
 * 模块页 - 显示该模块下的游戏列表。
 *
 * - 模块元信息从 data/config.json 动态读取（标题/图标/描述）
 * - 游戏列表从 gameMetas 按模块筛选（轻量元信息，不含组件代码）
 * - 点击游戏跳转到对应模块的分包 page（按需下载该模块游戏代码）
 * - P0 游戏排在前面（精选），P1 按 registry 顺序排列
 */
export default function Module() {
  const router = useRouter();
  const module = (router.params.module || 'math') as ModuleKey;

  const meta = ((config.modules as ModuleMeta[]) ?? []).find((m) => m.key === module);
  const title = meta?.title ?? module;
  const icon = meta?.icon ?? '🎮';
  const description = meta?.description ?? '';

  const list = getGameMetasByModule(module);

  return (
    <View className="min-h-screen px-5 pt-10 pb-12 max-w-3xl mx-auto bg-cream">
      <View className="text-center mb-2">
        <Text className="text-5xl">{icon}</Text>
        <Text className="block text-2xl font-bold text-ink mt-2">{title}</Text>
        {description ? (
          <Text className="block text-inkSoft text-xs mt-1 px-4">{description}</Text>
        ) : null}
      </View>

      <View className="mt-4 mb-6 text-center">
        <Text className="text-sm text-inkSoft">共 {list.length} 个内容</Text>
      </View>

      {list.length === 0 ? (
        <View className="text-center py-12">
          <Text className="text-4xl">🚧</Text>
          <Text className="block text-inkSoft mt-2">该模块暂未上架内容</Text>
        </View>
      ) : (
        <View className="grid grid-cols-2 gap-3">
          {list.map((g) => (
            <View
              key={g.id}
              className="flex flex-col items-center gap-2 rounded-3xl bg-white shadow-soft p-4"
              onClick={() =>
                Taro.navigateTo({
                  url: `/packages/${module}/pages/game/index?gameId=${g.id}`,
                })
              }
            >
              <Text className="text-4xl">{g.icon}</Text>
              <Text className="text-ink font-bold text-sm">{g.title}</Text>
              {g.priority === 'P0' ? (
                <Text className="text-xs text-mint font-bold">精选</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
