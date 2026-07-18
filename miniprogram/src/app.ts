import { Component, PropsWithChildren } from 'react';
import './app.css';

/**
 * 应用入口。
 *
 * 小程序版与 Web 版共享同一套 platform 抽象层（storage/tts/audio），
 * 运行时自动检测到 wx 全局对象后切换为小程序实现。
 */
class App extends Component<PropsWithChildren> {
  componentDidMount() {
    // 平台抽象层会在首次调用时自动初始化
  }

  componentDidShow() {}

  componentDidHide() {}

  render() {
    return this.props.children;
  }
}

export default App;
