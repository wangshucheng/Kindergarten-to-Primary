/**
 * 微信小程序全局 API 类型声明（最小化）。
 *
 * 仅声明 platform 抽象层用到的 wx API，避免引入完整的小程序类型定义。
 * 当迁移到 Taro 时，Taro 会注入完整的类型，此文件可安全移除。
 */

/** 微信小程序全局对象 */
declare const wx: {
  env: {
    USER_DATA_PATH: string;
  };
  getSystemInfoSync(): unknown;
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  removeStorageSync(key: string): void;
  createWebAudioContext(): unknown;
  createInnerAudioContext(): {
    src: string;
    autoplay: boolean;
    play(): void;
    stop(): void;
    destroy(): void;
    onPlay(cb: () => void): void;
    onEnded(cb: () => void): void;
    onError(cb: (err: unknown) => void): void;
  };
  getFileSystemManager(): {
    accessSync(path: string): void;
    mkdirSync(path: string, recursive?: boolean): void;
    readFileSync(path: string): ArrayBuffer;
    writeFileSync(path: string, data: ArrayBuffer | string, encoding?: string): void;
    unlinkSync(path: string): void;
  };
  downloadFile(opts: {
    url: string;
    filePath?: string;
    success?: (res: { tempFilePath: string; filePath: string; statusCode: number }) => void;
    fail?: (err: { errMsg: string }) => void;
  }): { abort(): void };
};

/** 微信小程序插件加载函数 */
declare function requirePlugin(name: string): unknown;
