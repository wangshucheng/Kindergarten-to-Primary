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
  // TTS 方案：预生成音频 + 三级缓存（无需 WechatSI 插件）
  // 音频文件上传到云存储后，通过 setCloudAudioBaseUrl() 配置 URL
  // 云开发（用于图片/音频存储，后续启用）
  // cloud: true,
};
