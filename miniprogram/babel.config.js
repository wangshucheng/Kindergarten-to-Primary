// babel-preset-taro 配置：Taro 3 + React 编译
module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true,
      compiler: 'webpack5',
    }],
  ],
};
