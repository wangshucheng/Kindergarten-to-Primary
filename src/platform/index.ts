/**
 * 平台抽象层入口 —— 统一的平台检测与 API 工厂。
 *
 * 设计目标：
 * - 业务代码只依赖 platform 导出的抽象接口，不直接调用浏览器/wx API；
 * - 运行时自动检测平台，Web 端用浏览器 API，小程序端用 wx API；
 * - 后续迁移到 Taro 时，只需替换 platform 内部实现，业务代码零改动。
 *
 * 覆盖的能力：
 * - storage：本地持久化（localStorage / wx.storage）
 * - tts：文字转语音（Web Speech API / 微信同声传译插件）
 * - audio：程序化音效（Web Audio API / wx.createWebAudioContext）
 */

// ---------------------------------------------------------------------------
// 平台检测
// ---------------------------------------------------------------------------

/**
 * 是否运行在微信小程序环境。
 * 判断依据：全局存在 wx 对象且具有 getSystemInfoSync 方法。
 */
export const isMiniProgram: boolean =
  typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function';

/**
 * 是否运行在浏览器环境。
 */
export const isWeb: boolean = !isMiniProgram;

// ---------------------------------------------------------------------------
// 统一导出
// ---------------------------------------------------------------------------

export { storage } from './storage';
export { createTtsBackend, type TtsBackend } from './tts';
export { createAudioContext, type AudioContextLike } from './audio';
