import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import type { CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  /** 圆角，默认大圆角贴合整体风格 */
  rounded?: string;
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
}

/**
 * Skeleton —— 骨架占位块（微光扫过），用于加载态占位，避免布局跳动与白屏。
 */
export function Skeleton({
  className = '',
  rounded = 'rounded-2xl',
  width,
  height,
  style,
}: SkeletonProps) {
  return (
    <View
      className={['skeleton', rounded, className].join(' ')}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonCard —— 与首页/模块页卡片同构的骨架，Suspense 回退时使用。
 */
export function SkeletonCard() {
  return (
    <View className="rounded-4xl p-5 bg-white/60 shadow-soft">
      <View className="flex items-center gap-3">
        <Skeleton width={56} height={56} rounded="rounded-3xl" />
        <View className="flex-1 space-y-2">
          <Skeleton height={20} width="60%" />
          <Skeleton height={12} width="85%" />
        </View>
      </View>
      <View className="mt-4 flex gap-2">
        <Skeleton height={22} width={72} rounded="rounded-full" />
        <Skeleton height={22} width={56} rounded="rounded-full" />
        <Skeleton height={22} width={64} rounded="rounded-full" />
      </View>
    </View>
  );
}

/**
 * SkeletonGrid —— 一组卡片骨架，用于列表加载态。
 */
export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <View className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
