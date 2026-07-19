import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * PageTransition —— 路由级页面过渡。
 * 以当前路径为 key 触发进入动画（淡入 + 轻微上浮），实现页面间的顺滑切换。
 * 纯 CSS 动画实现，零额外依赖，并自动尊重系统 reduced-motion。
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <View
      key={location.pathname}
      className="animate-fadeInUp"
      style={{ animationDuration: '0.42s' }}
    >
      {children}
    </View>
  );
}
