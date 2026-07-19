import { Component, PropsWithChildren } from 'react';
import './app.css';
import { initCloud, probeCloud } from './platform/cloudFile';

/**
 * 应用入口。
 *
 * 小程序版与 Web 版共享同一套 platform 抽象层（storage/tts/audio），
 * 运行时自动检测到 wx 全局对象后切换为小程序实现。
 *
 * 启动时初始化微信云开发（wx.cloud.init），图片/音频的 cloud:// 访问
 * 都依赖此初始化。云存储文件无需公开读权限，wx.cloud 会签发临时凭证。
 *
 * 注意：initCloud 必须在模块加载期同步调用（早于任何页面渲染），
 * 否则首屏 CloudImage / TTS 在云未就绪时调用会静默失败。
 */
// 模块加载期即初始化云开发（小程序环境才有效）
initCloud();

// 启动自检探针：在控制台打印一次 getTempFileURL 的真实返回，便于排查
if (typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function') {
  setTimeout(() => probeCloud(), 500);
}

class App extends Component<PropsWithChildren> {
  componentDidMount() {}

  componentDidShow() {}

  componentDidHide() {}

  render() {
    return this.props.children;
  }
}

export default App;
