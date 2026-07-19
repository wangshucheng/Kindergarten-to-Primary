import { defineConfig } from '@tarojs/cli';
import devConfig from './dev';
import prodConfig from './prod';
import { UnifiedWebpackPluginV5 } from 'weapp-tailwindcss/webpack';
import path from 'path';

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
    // 注：已放弃 @web alias 方案（导致 React 多实例冲突 #327 错误），
    // 改为小程序内独立实现游戏页面。
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
      // 关闭 optimizeMainPackage：避免 Taro 把主包/分包共享代码拆到分包的 sub-common/ 目录，
      // 该机制在某些场景下分包运行时无法注册 sub-common 模块，报 "module is not defined"。
      // 关闭后共享代码留在主包 common.js，主包体积会增大但仍远低于 2MB 限制。
      optimizeMainPackage: { enable: false },
      commonChunks: ['runtime', 'vendors', 'taro', 'common'],
      addChunkPages(pages) {
        // 每个游戏页面独立分包
      },
      // 修复 webpackbar 选项不兼容 webpack5 的问题 + 捕获编译错误 + 处理 Tailwind 转义
      webpackChain(chain) {
        chain.plugins.delete('webpackbar');
        // @ 别名指向 src/，与 tsconfig.json 的 paths 保持一致
        chain.resolve.alias.set('@', path.resolve(__dirname, '..', 'src'));
        // weapp-tailwindcss：处理小程序中 Tailwind 类名的转义字符
        // 自动把 .top-0\.5 → .top-0-5 等合法形式，并同步更新 wxml class 属性
        chain.plugin('weappTailwindcss').use(UnifiedWebpackPluginV5, [{
          appType: 'taro',
        }]);

        // 强制降级到 ES5：zod 3.25+ 和 zustand 5 使用了可选链（?.）和空值合并（??）等 ES2020 语法，
        // 微信小程序 V8 引擎不支持，会导致 "Unexpected token ." 编译错误。
        // 通过 babel-loader 处理 node_modules 中的 ES2020 语法。
        chain.module.rule('es5')
          .test(/\.js$/)
          .include.add(/node_modules[\\/](zod|zustand)/)
          .end()
          .use('babel-loader')
          .loader('babel-loader')
          .options({
            presets: [
              ['@babel/preset-env', { targets: { chrome: '53' }, modules: false }],
            ],
          });

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
