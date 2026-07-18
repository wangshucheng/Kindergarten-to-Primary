import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import './index.css';

/**
 * 模块页 - 显示该模块下的游戏列表。
 * 迁移自 Web 版 ModulePage.tsx：
 *   - useRouter().params.module 替代 useParams()
 *   - 保留原 HomePage 的网格布局和 Tailwind class
 */
export default function Module() {
  const router = useRouter();
  const module = router.params.module || 'math';

  const games: Record<string, Array<{ id: string; title: string; icon: string }>> = {
    math: [
      { id: 'make-ten', title: '凑十法', icon: '🍎' },
      { id: 'multiplication', title: '乘法表', icon: '✖️' },
      { id: 'sudoku', title: '数独', icon: '🔢' },
    ],
    english: [
      { id: 'vocab-drill', title: '核心词汇', icon: '📚' },
      { id: 'category-learn', title: '分类学习', icon: '🏷️' },
    ],
    hanzi: [
      { id: 'flip-memory', title: '翻牌记忆', icon: '🃏' },
      { id: 'match3', title: '汉字消消乐', icon: '✨' },
    ],
    pinyin: [
      { id: 'pinyin-match', title: '拼音配对', icon: '🎯' },
    ],
  };

  const list = games[module] || [];

  return (
    <View className="min-h-screen px-5 pt-10 pb-12 max-w-3xl mx-auto bg-cream">
      <View className="text-center mb-6">
        <Text className="text-2xl font-bold text-ink">{module} 模块</Text>
      </View>
      <View className="grid grid-cols-2 gap-3">
        {list.map((g) => (
          <View
            key={g.id}
            className="flex flex-col items-center gap-2 rounded-3xl bg-white shadow-soft p-4"
            onClick={() => Taro.navigateTo({ url: `/pages/game/index?module=${module}&gameId=${g.id}` })}
          >
            <Text className="text-4xl">{g.icon}</Text>
            <Text className="text-ink font-bold text-sm">{g.title}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
