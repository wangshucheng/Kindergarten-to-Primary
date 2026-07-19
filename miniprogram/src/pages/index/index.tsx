import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { storage } from '../../platform';
import { createTtsBackend } from '../../platform/tts';
import config from '../../data/config.json';
import { gameMetas } from '../../games/gameMetas';
import './index.css';

type ModuleMeta = {
  key: string;
  title: string;
  icon: string;
  description?: string;
};

/**
 * 主页 - 模块入口 + P0 游戏快捷入口。
 *
 * - 模块列表从 data/config.json 动态读取（含 poetry/geometry）
 * - P0 游戏从 miniprogramRegistry 动态筛选，保证 id 与注册表一致
 * - 保留抽象层初始化验证（开发期可见，便于排查 storage/tts 是否就绪）
 */
export default function Index() {
  // 抽象层初始化验证：lazy initializer 在首屏同步执行，确保 status 一开始就有值
  const [ttsReady] = useState(() => {
    try {
      createTtsBackend();
      return true;
    } catch {
      return false;
    }
  });
  const [storageReady] = useState(() => {
    try {
      storage.setItem('test-key', 'test-value');
      const val = storage.getItem('test-key');
      return val === 'test-value';
    } catch {
      return false;
    }
  });

  const handleSpeak = () => {
    // 小程序端 TTS 仅支持预生成音频（英文单词），这里用已生成的 "apple" 验证
    const tts = createTtsBackend();
    tts.speak('apple', { lang: 'en-US' });
  };

  const goModule = (module: string) => {
    Taro.navigateTo({ url: `/pages/module/index?module=${module}` });
  };

  const modules = (config.modules as ModuleMeta[]) ?? [];
  const p0Games = gameMetas.filter((g) => g.priority === 'P0');

  return (
    <View className="min-h-screen px-5 pt-10 pb-12 max-w-3xl mx-auto bg-cream">
      <View className="text-center mb-8 animate-fadeIn">
        <Text className="text-3xl font-bold text-ink">{config.appName}</Text>
        <Text className="block text-inkSoft text-sm mt-2">
          小程序版 · 共 {gameMetas.length} 个游戏
        </Text>
      </View>

      {/* 抽象层初始化状态（开发期排查用） */}
      <View className="bg-white rounded-3xl shadow-soft p-4 mb-6">
        <Text className="text-ink font-bold text-base">平台抽象层状态</Text>
        <View className="mt-2 flex flex-col gap-1">
          <Text className="text-sm text-inkSoft">
            TTS 后端：{ttsReady ? '✅ 已初始化' : '⏳ 初始化中'}
          </Text>
          <Text className="text-sm text-inkSoft">
            Storage 后端：{storageReady ? '✅ 读写正常' : '⏳ 测试中'}
          </Text>
        </View>
      </View>

      {/* 模块入口（从 config.json 动态读取） */}
      <View className="grid grid-cols-2 gap-3 mb-6">
        {modules.map((m) => (
          <View
            key={m.key}
            className="flex flex-col items-center gap-1 rounded-3xl bg-white shadow-soft p-4"
            onClick={() => goModule(m.key)}
          >
            <Text className="text-4xl">{m.icon}</Text>
            <Text className="text-ink font-bold text-sm">{m.title}</Text>
            <Text className="text-inkSoft text-xs text-center mt-1 line-clamp-2">{m.description}</Text>
          </View>
        ))}
      </View>

      {/* P0 游戏快捷入口（从 registry 动态读取，id 与注册表一致） */}
      <View className="bg-white rounded-3xl shadow-soft p-4 mb-6">
        <Text className="text-ink font-bold text-base">P0 精选游戏</Text>
        <View className="mt-3 grid grid-cols-2 gap-2">
          {p0Games.map((g) => (
            <View
              key={g.id}
              className="flex flex-col items-center gap-1 rounded-2xl bg-cream p-3"
              onClick={() =>
                Taro.navigateTo({
                  url: `/packages/${g.module}/pages/game/index?gameId=${g.id}`,
                })
              }
            >
              <Text className="text-2xl">{g.icon}</Text>
              <Text className="text-xs text-ink font-bold">{g.title}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* TTS 测试按钮 */}
      <View
        className="mt-2 mx-auto px-6 py-3 rounded-full bg-mint text-white font-bold shadow-soft text-center"
        onClick={handleSpeak}
      >
        <Text>🔊 测试 TTS 朗读</Text>
      </View>
    </View>
  );
}
