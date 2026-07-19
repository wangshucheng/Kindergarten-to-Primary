/**
 * 微信小程序全局 API 类型声明（最小化）。
 *
 * 仅声明 platform 抽象层用到的 wx API，避免引入完整的小程序类型定义。
 * 当迁移到 Taro 时，Taro 会注入完整的类型，此文件可安全移除。
 */

/** wx.env：运行环境常量 */
declare namespace wx {
  namespace env {
    const USER_DATA_PATH: string;
  }
}

/** 文件系统管理器（用于 TTS 三级缓存的本地文件读写） */
interface WxFileSystemManager {
  mkdirSync(dirPath: string, recursive?: boolean): void;
  accessSync(path: string): void;
  readFileSync(filePath: string, encoding?: string): string | ArrayBuffer;
  writeFileSync(filePath: string, data: string | ArrayBuffer, encoding?: string): void;
  unlinkSync(filePath: string): void;
}

/** 下载任务回调 */
interface WxDownloadFileSuccess {
  tempFilePath: string;
  filePath: string;
  statusCode: number;
}

interface WxDownloadFileOption {
  url: string;
  filePath?: string;
  success?(res: WxDownloadFileSuccess): void;
  fail?(err: { errMsg: string }): void;
  complete?(): void;
}

/** wx.cloud.downloadFile 成功回调（按 fileID 下载云存储文件） */
interface WxCloudDownloadFileSuccess {
  tempFilePath: string;
  filePath: string;
  statusCode: number;
}

/** 微信小程序全局对象 */
declare const wx: {
  getSystemInfoSync(): unknown;
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  removeStorageSync(key: string): void;
  createWebAudioContext(): unknown;
  createInnerAudioContext(): {
    src: string;
    play(): void;
    stop(): void;
    destroy(): void;
    onPlay(cb: () => void): void;
    onEnded(cb: () => void): void;
    onError(cb: (err: unknown) => void): void;
  };
  getFileSystemManager(): WxFileSystemManager;
  downloadFile(option: WxDownloadFileOption): { abort(): void };
  /** 云开发 API（最小化声明，仅覆盖 platform 层用到的接口） */
  cloud: {
    init(options: { env?: string; traceUser?: boolean }): void;
    downloadFile(option: {
      fileID: string;
      filePath?: string;
      success?(res: WxCloudDownloadFileSuccess): void;
      fail?(err: { errMsg: string }): void;
    }): void;
    getTempFileURL(option: {
      fileList: string[];
      success?(res: {
        fileList: Array<{ fileID: string; tempFileURL: string; status?: number }>;
      }): void;
      fail?(err: { errMsg: string }): void;
    }): void;
    callFunction(option: {
      name: string;
      data?: Record<string, unknown>;
      success?(res: { result: unknown }): void;
      fail?(err: { errMsg: string }): void;
    }): void;
  };
};
