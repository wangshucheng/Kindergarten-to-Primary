import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { storage } from '../../platform';
import { createTtsBackend, type TtsBackend } from '../../platform/tts';
import './index.css';

/**
 * 主页 - 验证 Taro + platform 抽象层 + Tailwind 集成。
 * 实际迁移时从 Web 版 HomePage.tsx 复制并做如下改动：
 *   - <div> → <View>
 *   - <button> → <View bindtap>
 *   - useNavigate → Taro.navigateTo
 *   - 保留所有 Tailwind class
 */
export default function Index() {
  const [ttsReady, setTtsReady] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [ttsText] = useState('你好，欢迎使用幼升小游戏！');

  useEffect(() => {
    // 验证 TTS 抽象层
    const tts: TtsBackend = createTtsBackend();
    setTtsReady(true);

    // 验证 storage 抽象层
    storage.setItem('test-key', 'test-value');
    const val = storage.getItem('test-key');
    setStorageReady(val === 'test-value');
  }, []);

  const handleSpeak = () => {
    const tts = createTtsBackend();
    tts.speak(ttsText, { lang: 'zh-CN' });
  };

  const goModule = (module: string) => {
    Taro.navigateTo({ url: `/pages/module/index?module=${module}` });
  };

  return (
    <View className="min-h-screen px-5 pt-10 pb-12 max-w-3xl mx-auto bg-cream">
      <View className="text-center mb-8 animate-fadeIn">
        <Text className="text-3xl font-bold text-ink">幼升小游戏</Text>
        <Text className="block text-inkSoft text-sm mt-2">
          Taro 小程序版 · 平台抽象层验证
        </Text>
      </View>

      {/* 抽象层验证状态 */}
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

      {/* 模块入口（示例） */}
      <View className="grid grid-cols-2 gap-3">
        {[
          { id: 'math', title: '数学乐园', icon: '🔢' },
          { id: 'english', title: '英语小镇', icon: '🔤' },
          { id: 'hanzi', title: '汉字天地', icon: '汉字' },
          { id: 'pinyin', title: '拼音王国', icon: '拼音' },
        ].map((m) => (
          <View
            key={m.id}
            className="flex flex-col items-center gap-1 rounded-3xl bg-white shadow-soft p-4"
            onClick={() => goModule(m.id)}
          >
            <Text className="text-4xl">{m.icon}</Text>
            <Text className="text-ink font-bold text-sm">{m.title}</Text>
          </View>
        ))}
      </View>

      {/* TTS 测试按钮 */}
      <View
        className="mt-6 mx-auto px-6 py-3 rounded-full bg-mint text-white font-bold shadow-soft text-center"
        onClick={handleSpeak}
      >
        <Text>🔊 测试 TTS 朗读</Text>
      </View>

      <View className="mt-8 text-center">
        <Text className="text-xs text-inkSoft">
          剩余迁移步骤请参考 MINIPROGRAM_MIGRATION.md
        </Text>
      </View>
    </View>
  );
}
