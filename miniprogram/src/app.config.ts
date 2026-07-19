export default {
  pages: [
    'pages/index/index',
    'pages/module/index',
  ],
  subPackages: [
    {
      root: 'packages/math',
      pages: ['pages/game/index'],
    },
    {
      root: 'packages/english',
      pages: ['pages/game/index'],
    },
    {
      root: 'packages/hanzi',
      pages: ['pages/game/index'],
    },
    {
      root: 'packages/pinyin',
      pages: ['pages/game/index'],
    },
    {
      root: 'packages/poetry',
      pages: ['pages/game/index'],
    },
    {
      root: 'packages/geometry',
      pages: ['pages/game/index'],
    },
  ],
  // 分包预下载：进入主包页面后预下载所有分包，避免进游戏时延迟
  preloadRule: {
    'pages/index/index': {
      network: 'all',
      packages: [
        'packages/math',
        'packages/english',
        'packages/hanzi',
        'packages/pinyin',
        'packages/poetry',
        'packages/geometry',
      ],
    },
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFF9F0',
    navigationBarTitleText: '幼升小游戏',
    navigationBarTextStyle: 'black',
  },
  // TTS 方案：预生成音频 + 三级缓存（无需 WechatSI 插件）
  // 音频文件上传到云存储后，通过 setCloudAudioBaseUrl() 配置 URL
  // 云开发（用于图片/音频存储，后续启用）
  // cloud: true,
};
