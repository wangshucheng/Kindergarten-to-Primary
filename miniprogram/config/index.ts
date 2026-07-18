import { defineConfig } from '@tarojs/cli';
import devConfig from './dev';
import prodConfig from './prod';
import path from 'node:path';
import { UnifiedWebpackPluginV5 } from 'weapp-tailwindcss/webpack';

export default defineConfig(async (merge, { command }) => {
  const base = {
    projectName: 'youxiao-games',
    date: '2026-7-18',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {},
    copy: {
      patterns: [],
      options: {},
    },
    framework: 'react',
    compiler: {
      type: 'webpack5',
      prebundle: { enable: false },
    },
    cache: { enable: false },
    // 别名：让小程序引用父目录的 Web 端源码（一套代码两端复用）
    alias: {
      '@web': path.resolve(__dirname, '../../src'),
    },
    mini: {
      postcss: {
        pxtransform: { enable: true, config: {} },
        cssModules: {
          enable: false,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]',
          },
        },
        // 启用 Tailwind CSS 处理（@tailwind 指令需要被处理为实际 CSS）
        tailwindcss: { enable: true },
      },
      // 分包配置（按模块拆分，避免主包超 2MB）
      optimizeMainPackage: { enable: true },
      commonChunks: ['runtime', 'vendors', 'taro', 'common'],
      addChunkPages(pages) {
        // 每个游戏页面独立分包
      },
      // 修复 webpackbar 选项不兼容 webpack5 的问题 + 捕获编译错误 + 处理 Tailwind 转义
      webpackChain(chain) {
        chain.plugins.delete('webpackbar');
        chain.resolve.alias.set('@web', path.resolve(__dirname, '../../src'));
        // weapp-tailwindcss：处理小程序中 Tailwind 类名的转义字符
        // 自动把 .top-0\.5 → .top-0-5 等合法形式，并同步更新 wxml class 属性
        chain.plugin('weappTailwindcss').use(UnifiedWebpackPluginV5, [{
          appType: 'taro',
        }]);
        chain.plugin('errorLogger').use({
          apply(compiler) {
            compiler.hooks.done.tap('ErrorLogger', (stats) => {
              const info = stats.toJson({ errors: true, warnings: true });
              if (info.errors && info.errors.length > 0) {
                console.error('\n[Build Errors]:');
                info.errors.forEach((e: unknown) =>
                  console.error(typeof e === 'string' ? e : (e as { message?: string }).message ?? JSON.stringify(e)),
                );
              }
            });
          },
        });
      },
    },
    h5: {},
  };

  if (process.env.NODE_ENV === 'development') {
    return merge({}, base, devConfig);
  }
  return merge({}, base, prodConfig);
});
