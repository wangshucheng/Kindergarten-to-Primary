/**
 * 存储抽象层 —— 统一 localStorage 与 wx.storage。
 *
 * API 与 localStorage 对齐，调用方无需感知平台差异。
 * 小程序端用 wx.getStorageSync / wx.setStorageSync，同步阻塞，行为一致。
 */

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// ---------------------------------------------------------------------------
// Web 实现：代理 globalThis.localStorage
// 用 globalThis 而非 window，以便在 node 测试环境通过 vi.stubGlobal 注入 mock
// ---------------------------------------------------------------------------

function getLs(): Storage | null {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

const webStorage: StorageAdapter = {
  getItem(key: string): string | null {
    try {
      return getLs()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      getLs()?.setItem(key, value);
    } catch {
      /* quota exceeded 静默降级 */
    }
  },
  removeItem(key: string): void {
    try {
      getLs()?.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

// ---------------------------------------------------------------------------
// 小程序实现：代理 wx.storage 同步 API
// ---------------------------------------------------------------------------

const wxStorage: StorageAdapter = {
  getItem(key: string): string | null {
    try {
      const val = wx.getStorageSync(key);
      return val === '' || val === undefined ? null : String(val);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      wx.setStorageSync(key, value);
    } catch {
      /* storage full 静默降级 */
    }
  },
  removeItem(key: string): void {
    try {
      wx.removeStorageSync(key);
    } catch {
      /* ignore */
    }
  },
};

// ---------------------------------------------------------------------------
// 运行时选择实现
// ---------------------------------------------------------------------------

function selectStorage(): StorageAdapter {
  if (typeof wx !== 'undefined' && typeof wx.getStorageSync === 'function') {
    return wxStorage;
  }
  return webStorage;
}

export const storage: StorageAdapter = selectStorage();
