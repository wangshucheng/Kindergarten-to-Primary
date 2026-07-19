import { Component, PropsWithChildren } from 'react';
import './app.css';
import { CLOUD_ENV } from './cloud-config';

/**
 * 应用入口。
 *
 * 小程序版与 Web 版共享同一套 platform 抽象层（storage/tts/audio），
 * 运行时自动检测到 wx 全局对象后切换为小程序实现。
 *
 * 启动时初始化微信云开发（wx.cloud.init），图片/音频的 cloud:// 访问
 * 都依赖此初始化。云存储文件无需公开读权限，wx.cloud 会签发临时凭证。
 */
class App extends Component<PropsWithChildren> {
  componentDidMount() {
    // 仅在小程序环境初始化云开发；Web 端使用 public/ 下的本地相对资源
    if (typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function') {
      if (typeof wx.cloud?.init === 'function') {
        wx.cloud.init({
          env: CLOUD_ENV,
          // 自动选择默认环境（多环境时取第一个）
          traceUser: true,
        });
      }
    }
  }

  componentDidShow() {}

  componentDidHide() {}

  render() {
    return this.props.children;
  }
}

export default App;
