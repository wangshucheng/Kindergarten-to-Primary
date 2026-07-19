/**
 * 云文件访问封装 —— 基于 wx.cloud 的签名临时凭证访问云存储文件。
 *
 * 提供两类能力：
 *   - isCloudAvailable(): 判断是否处于已初始化的微信云开发环境
 *   - getTempFileUrl(fileID): 把 cloud:// 文件 ID 换成可访问的临时 HTTPS URL
 *     （用于 <Image src>，内部带缓存避免重复签发）
 *
 * 该方案无需云存储文件公开读，wx.cloud 会自动用临时凭证授权访问，
 * 从而规避此前「公开读权限缺失导致 403」的问题。
 *
 * 依赖：app.ts 启动时调用过 wx.cloud.init({ env })。
 */

/** 是否处于可用的微信云开发环境（wx.cloud 已初始化） */
export function isCloudAvailable(): boolean {
  return (
    typeof wx !== 'undefined' &&
    typeof wx.cloud !== 'undefined' &&
    typeof wx.cloud.getTempFileURL === 'function'
  );
}

/** fileID → 临时 URL 缓存（临时凭证有效期内复用） */
const tempUrlCache = new Map<string, string>();

/**
 * 把 cloud:// 文件 ID 换成临时可访问的 HTTPS URL。
 * @param fileID cloud:// 开头的文件 ID；若已是 http(s) 链接则原样返回
 * @returns Promise<string|null> 成功返回临时 URL，失败返回 null
 */
export function getTempFileUrl(fileID: string): Promise<string | null> {
  // 非云文件 ID（已是 http(s) 链接）直接透传
  if (!fileID || !fileID.startsWith('cloud://')) {
    return Promise.resolve(fileID || null);
  }
  // 命中缓存
  const cached = tempUrlCache.get(fileID);
  if (cached) return Promise.resolve(cached);

  if (!isCloudAvailable()) return Promise.resolve(null);

  return new Promise<string | null>((resolve) => {
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: (res) => {
        const item = res.fileList && res.fileList[0];
        // 某些情况下 fileList[0] 会带 status 字段，0 表示成功
        const url =
          item && (item as { status?: number; tempFileURL?: string }).status !== -1
            ? (item as { tempFileURL?: string }).tempFileURL
            : undefined;
        if (url) {
          tempUrlCache.set(fileID, url);
          resolve(url);
        } else {
          resolve(null);
        }
      },
      fail: () => resolve(null),
    });
  });
}
