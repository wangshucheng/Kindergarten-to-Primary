export default {
  pages: [
    'pages/index/index',
    'pages/module/index',
    'pages/game/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFF9F0',
    navigationBarTitleText: '幼升小游戏',
    navigationBarTextStyle: 'black',
  },
  // 微信同声传译插件（TTS 必需）
  plugins: {
    WechatSI: {
      version: '0.3.7',
      provider: 'wx069ba97219f66d99',
    },
  },
  // 分包配置：6 大模块各自独立分包，避免主包超 2MB
  subPackages: [
    {
      root: 'pages/math',
      pages: ['index'],
    },
    {
      root: 'pages/english',
      pages: ['index'],
    },
    {
      root: 'pages/hanzi',
      pages: ['index'],
    },
    {
      root: 'pages/pinyin',
      pages: ['index'],
    },
    {
      root: 'pages/poetry',
      pages: ['index'],
    },
    {
      root: 'pages/geometry',
      pages: ['index'],
    },
  ],
  // 云开发（用于图片存储，后续启用）
  // cloud: true,
};
