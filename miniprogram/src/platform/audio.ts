/**
 * 音频抽象层 —— 统一 Web Audio API 与小程序 WebAudio。
 *
 * 微信小程序基础库 2.19+ 已支持 wx.createWebAudioContext()，
 * 其接口与标准 Web Audio API（AudioContext / OscillatorNode / GainNode）高度对齐。
 *
 * 本模块提供工厂函数，运行时自动选择实现。
 * SoundManager 通过此工厂创建 AudioContext，内部合成逻辑零改动。
 */

/**
 * AudioContext 的抽象类型。
 * 复用浏览器原生类型（OscillatorNode/GainNode 等），
 * 小程序端 wx.createWebAudioContext() 返回的对象也实现相同接口。
 */
export type AudioContextLike = AudioContext;

/**
 * 创建 AudioContext 实例。
 *
 * Web 端：new AudioContext()（含 webkitAudioContext 兼容）
 * 小程序端：wx.createWebAudioContext()
 *
 * @returns AudioContext 实例，或在不支持时返回 null
 */
export function createAudioContext(): AudioContextLike | null {
  // 小程序环境
  if (typeof wx !== 'undefined' && typeof wx.createWebAudioContext === 'function') {
    try {
      return wx.createWebAudioContext() as unknown as AudioContext;
    } catch {
      return null;
    }
  }

  // Web 环境
  if (typeof window === 'undefined') return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  return new Ctor();
}
