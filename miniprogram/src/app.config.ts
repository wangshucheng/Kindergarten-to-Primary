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
  // 组件按需注入：仅注入当前页面用到的自定义组件，减少启动加载
  lazyCodeLoading: 'requiredComponents',
  // 分包预下载：进入主包页面后预下载所有分包，避免进内容时延迟
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
    navigationBarTitleText: '幼升小',
    navigationBarTextStyle: 'black',
  },
  // TTS 方案：预生成音频 + 三级缓存（无需 WechatSI 插件）
  // 音频/图片上传到微信云存储后，运行时由 wx.cloud 签名临时凭证访问，
  // 需在 app.ts 启动 wx.cloud.init({ env })，文件无需公开读权限。
  cloud: true,
};
