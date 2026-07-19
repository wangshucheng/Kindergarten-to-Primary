import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import { useTTS } from '../../../sound/useTTS';
import { computeStars } from '../../../utils/gameLoop';
import {
  getCategories,
  getWordsByCategory,
  type CategoryItem,
  type WordCard,
} from './categoryLearnLogic';

type View = 'categories' | 'words';

/**
 * 分类学习卡片：点击分类浏览单词，点击单词朗读英文。
 * 浏览模式 —— 无计分无闯关，自由学习工具。
 */
export function CategoryLearnGame({ sound, tts: ttsManager, onComplete }: GameProps) {
  const tts = useTTS(ttsManager);
  const [view, setView] = useState<View>('categories');
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [speakingAll, setSpeakingAll] = useState(false);
  // 图片加载失败（如云端 403）的单词，回退显示 emoji
  const [imgFailed, setImgFailed] = useState<Set<string>>(new Set());
  const startRef = useRef<number>(Date.now());
  const speakAllTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categories = useMemo(() => getCategories(), []);
  const words = useMemo<WordCard[]>(
    () => (activeTheme ? getWordsByCategory(activeTheme) : []),
    [activeTheme],
  );

  useEffect(() => {
    tts.speakZh('分类学习卡片来啦！点一个分类，看看里面有哪些单词吧～');
    return () => {
      tts.stop();
      if (speakAllTimer.current) clearTimeout(speakAllTimer.current);
    };
  }, []);

  // 进入分类
  const enterCategory = (cat: CategoryItem): void => {
    sound.play('click');
    setActiveTheme(cat.theme);
    setView('words');
    tts.speakZh(`${cat.theme}，共 ${cat.count} 个单词。`);
  };

  // 返回分类列表
  const backToCategories = (): void => {
    sound.play('click');
    if (speakingAll) {
      setSpeakingAll(false);
      tts.stop();
      if (speakAllTimer.current) clearTimeout(speakAllTimer.current);
    }
    setView('categories');
    setActiveTheme(null);
  };

  // 朗读单个单词
  const speakWord = (word: WordCard): void => {
    sound.play('click');
    tts.speakEn(word.en);
  };

  // 全部朗读：依次朗读分类内所有单词
  const speakAll = (): void => {
    if (speakingAll) {
      setSpeakingAll(false);
      tts.stop();
      if (speakAllTimer.current) clearTimeout(speakAllTimer.current);
      return;
    }
    setSpeakingAll(true);
    sound.play('levelup');
    let i = 0;
    const speakNext = (): void => {
      if (i >= words.length) {
        setSpeakingAll(false);
        return;
      }
      const w = words[i];
      tts.speakEn(w.en, {
        onEnd: (): void => {
          i++;
          speakAllTimer.current = setTimeout(speakNext, 400);
        },
      });
    };
    speakNext();
  };

  // 完成学习（退出）
  const finish = (): void => {
    sound.play('win');
    const durationMs = Date.now() - startRef.current;
    const stars = computeStars({ passed: true, mistakes: 0, durationMs });
    onComplete({ score: 0, passed: true, stars, durationMs });
  };

  // ---------- 分类网格视图 ----------
  if (view === 'categories') {
    return (
      <View className="flex flex-col items-center gap-4">
        <View className="text-center text-ink font-bold text-lg">单词分类学习</View>
        <View className="text-inkSoft text-sm text-center">点击一个分类，开始学习</View>

        <View className="w-full grid grid-cols-3 gap-3">
          {categories.map((cat) => (
            <View
              key={cat.theme}
              onClick={() => enterCategory(cat)}
              className="flex flex-col items-center gap-1 rounded-3xl bg-white shadow-soft p-4 transition-all active:scale-95 hover:bg-cream"
              style={{ touchAction: 'manipulation' }}
            >
              <Text className="text-4xl">{cat.emoji}</Text>
              <Text className="text-ink font-bold text-sm">{cat.theme}</Text>
              <Text className="text-inkSoft text-xs">{cat.count} 词</Text>
            </View>
          ))}
        </View>

        <View
          onClick={finish}
          className="mt-2 px-6 py-2 rounded-full bg-mint text-white font-bold shadow-soft active:scale-95"
        >
          完成学习
        </View>
      </View>
    );
  }

  // ---------- 单词卡片视图 ----------
  const activeCat = categories.find((c) => c.theme === activeTheme);
  return (
    <View className="flex flex-col items-center gap-3">
      <View className="flex items-center gap-3 w-full">
        <View
          onClick={backToCategories}
          className="px-4 py-2 rounded-full bg-white text-ink font-bold shadow-soft active:scale-95 text-sm"
          style={{ touchAction: 'manipulation' }}
        >
          ← 返回分类
        </View>
        <View className="text-ink font-bold flex-1 text-center">
          {activeCat?.emoji} {activeTheme} ({words.length} 词)
        </View>
        <View
          onClick={speakAll}
          className={[
            'px-4 py-2 rounded-full font-bold shadow-soft active:scale-95 text-sm',
            speakingAll ? 'bg-lemon text-ink' : 'bg-sky text-white',
          ].join(' ')}
          style={{ touchAction: 'manipulation' }}
        >
          {speakingAll ? '⏹ 停止' : '🔊 全部朗读'}
        </View>
      </View>

      <View className="w-full grid grid-cols-2 gap-3">
        {words.map((w) => (
          <View
            key={w.en}
            onClick={() => speakWord(w)}
            className="flex flex-col items-center gap-1 rounded-3xl bg-white shadow-soft p-3 transition-all active:scale-95 hover:bg-cream"
            style={{ touchAction: 'manipulation' }}
          >
            {w.image && !imgFailed.has(w.en) ? (
              <Image
                src={w.image}
                alt={w.en}
                className="w-16 h-16 object-cover rounded-2xl"
                loading="lazy"
                onError={() =>
                  setImgFailed((prev) => {
                    const next = new Set(prev);
                    next.add(w.en);
                    return next;
                  })
                }
              />
            ) : (
              <Text className="text-4xl leading-none">{w.emoji}</Text>
            )}
            <Text className="text-ink font-extrabold text-base">{w.en}</Text>
            <Text className="text-inkSoft text-xs">{w.zh}</Text>
            {w.example && (
              <Text className="text-inkSoft text-[10px] text-center leading-tight mt-1">
                {w.example}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export default CategoryLearnGame;
