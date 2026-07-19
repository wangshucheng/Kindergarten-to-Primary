import { Component, PropsWithChildren } from 'react';
import './app.css';
import { setCloudAudioBaseUrl } from './platform/tts';
import { setCloudImageBaseUrl } from './data/wordImages';
import { CLOUD_AUDIO_BASE_URL, CLOUD_IMAGE_BASE_URL } from './cloud-config';

/**
 * 应用入口。
 *
 * 小程序版与 Web 版共享同一套 platform 抽象层（storage/tts/audio），
 * 运行时自动检测到 wx 全局对象后切换为小程序实现。
 *
 * 启动时初始化云端资源配置（音频/图片 CDN URL）。
 */
class App extends Component<PropsWithChildren> {
  componentDidMount() {
    // 仅在小程序环境配置云端 URL；Web 端使用 public/ 下的本地相对路径
    if (typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function') {
      if (CLOUD_AUDIO_BASE_URL) {
        setCloudAudioBaseUrl(CLOUD_AUDIO_BASE_URL);
      }
      if (CLOUD_IMAGE_BASE_URL) {
        setCloudImageBaseUrl(CLOUD_IMAGE_BASE_URL);
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
