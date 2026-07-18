import { defineConfig } from '@tarojs/cli';
import devConfig from './dev';
import prodConfig from './prod';

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
      },
      // 分包配置（按模块拆分，避免主包超 2MB）
      optimizeMainPackage: { enable: true },
      commonChunks: ['runtime', 'vendors', 'taro', 'common'],
      addChunkPages(pages) {
        // 每个游戏页面独立分包
      },
      // 修复 webpackbar 选项不兼容 webpack5 的问题 + 捕获编译错误
      webpackChain(chain) {
        chain.plugins.delete('webpackbar');
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
