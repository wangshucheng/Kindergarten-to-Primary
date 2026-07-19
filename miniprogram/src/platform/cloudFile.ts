/**
 * 云文件访问封装 —— 统一图片/音频等云存储资源的获取。
 *
 * 当前云存储读安全规则为「仅创建者可读写」，小程序访客身份直接
 * wx.cloud.downloadFile 会被拦截（-403003 empty download url），且无法修改权限，
 * 因此实际链路为：
 *   1. 先尝试 wx.cloud.downloadFile(fileID)（直连，若日后放开权限则最快）；
 *   2. 失败则回退 fetchViaCloudProxy()：经 cloudProxy 云函数以服务端管理员身份
 *      读取云存储文件、返回 base64，由小程序写入本地文件后显示/播放。
 * 两种方式都基于云开发接口，免「服务器域名白名单」。
 *
 * 提供能力：initCloud / isCloudAvailable / probeCloud / fetchViaCloudProxy。
 * 依赖：app.ts 启动时调用过 initCloud()；cloudProxy 云函数已上传部署。
 */

import { CLOUD_ENV } from '../cloud-config';

/**
 * 初始化微信云开发。必须在任何 getTempFileURL / downloadFile 调用之前执行一次。
 * 打印成功/失败日志，便于在 DevTools 控制台定位「云不可用」类问题。
 */
export function initCloud(): void {
  if (typeof wx === 'undefined' || typeof wx.getSystemInfoSync !== 'function') {
    console.warn('[cloud] 非小程序环境，跳过 wx.cloud.init');
    return;
  }
  if (typeof wx.cloud?.init !== 'function') {
    console.error(
      '[cloud] wx.cloud.init 不是函数 —— 云能力未启用。请确认 app.json 含 "cloud": true，' +
        '并在微信开发者工具中已开通云开发 / 关联环境。',
    );
    return;
  }
  try {
    wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
    console.log('[cloud] wx.cloud.init 成功，env =', CLOUD_ENV);
  } catch (e) {
    console.error('[cloud] wx.cloud.init 抛异常', e);
  }
}

/**
 * 启动自检探针：用「已确认存在」的文件走 cloudProxy 云函数链路，把结果打到控制台。
 * 若代理成功取回本地路径，则证明「代码 + 环境 + cloudProxy 已部署」全部正常，
 * 直连 -403003 会被代理兜底。
 * @param fileID 待测文件 ID，默认用已确认存在的 images/words/aunt.png
 */
export async function probeCloud(
  fileID = 'cloud://cloud1-d5g2o67hb3101ab8a.636c-cloud1-d5g2o67hb3101ab8a-1455652056/images/words/aunt.png',
): Promise<void> {
  if (!isCloudAvailable()) {
    console.error('[cloud][probe] 云不可用，无法自检：', fileID);
    return;
  }
  if (typeof wx.cloud?.callFunction !== 'function') {
    console.error('[cloud][probe] 云函数不可用（请先部署 cloudProxy 云函数）：', fileID);
    return;
  }
  const localPath = await fetchViaCloudProxy(fileID);
  if (localPath) {
    console.log('[cloud][probe] cloudProxy 取回本地路径成功：', localPath, 'fileID=', fileID);
  } else {
    console.error(
      '[cloud][probe] cloudProxy 取回失败：确认 cloudProxy 云函数已上传部署，fileID=',
      fileID,
    );
  }
}

/** 是否处于可用的微信云开发环境（wx.cloud 已初始化） */
export function isCloudAvailable(): boolean {
  return (
    typeof wx !== 'undefined' &&
    typeof wx.cloud !== 'undefined' &&
    typeof wx.cloud.downloadFile === 'function'
  );
}

// ---------------------------------------------------------------------------
// 云函数代理（cloudProxy）：以服务端管理员身份读取云存储文件，绕过读安全规则
// ---------------------------------------------------------------------------

/** 本地文件缓存：fileID → 已写入的本地路径（避免重复调用云函数） */
let proxyPathCache: Record<string, string> = {};

/** 简单字符串哈希（djb2），用作本地缓存文件名，避免非法字符 */
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

/**
 * 经 cloudProxy 云函数（服务端管理员身份）读取云存储文件，
 * 写入本地缓存后返回本地文件路径；失败返回 null。
 * 用于绕过云存储读安全规则导致的 wx.cloud.downloadFile -403003 empty download url。
 *
 * 链路：callFunction(cloudProxy) → 云端以管理员身份 downloadFile → base64 返回
 *       → 写入 USER_DATA_PATH/cloudproxy/ → 返回本地路径给 <Image> / 音频播放。
 * 首次命中云函数（含冷启动），之后从本地文件缓存直接返回。
 *
 * @param fileID 完整 cloud:// 文件 ID
 */
export function fetchViaCloudProxy(fileID: string): Promise<string | null> {
  if (!fileID) return Promise.resolve(null);
  if (proxyPathCache[fileID]) return Promise.resolve(proxyPathCache[fileID]);
  if (!isCloudAvailable() || typeof wx.cloud?.callFunction !== 'function') {
    return Promise.resolve(null);
  }
  const dot = fileID.lastIndexOf('.');
  const ext = dot >= 0 ? fileID.slice(dot).toLowerCase() : '';
  const localPath = `${wx.env.USER_DATA_PATH}/cloudproxy/${hashStr(fileID)}${ext}`;
  try {
    wx.getFileSystemManager().accessSync(localPath);
    proxyPathCache[fileID] = localPath;
    return Promise.resolve(localPath);
  } catch {
    // 本地缓存不存在，继续经云函数获取
  }
  return new Promise<string | null>((resolve) => {
    wx.cloud.callFunction({
      name: 'cloudProxy',
      data: { fileID },
      success: (res) => {
        const r = res.result as
          | { ok?: boolean; base64?: string; error?: string }
          | undefined;
        if (r && r.ok && r.base64) {
          try {
            const fs = wx.getFileSystemManager();
            const dir = localPath.slice(0, localPath.lastIndexOf('/'));
            try {
              fs.mkdirSync(dir, true);
            } catch {
              // 目录可能已存在
            }
            fs.writeFileSync(localPath, r.base64, 'base64');
            proxyPathCache[fileID] = localPath;
            resolve(localPath);
          } catch (e) {
            console.error('[cloud][proxy] 写本地文件失败：', fileID, String(e));
            resolve(null);
          }
        } else {
          // 文件不存在（not exists）多为命名契约推定路径尚未生成的预期情况
          // （如中文兜底音频），调用方会走合成/回退，避免告警刷屏。
          if (!/not exists/i.test(r?.error || '')) {
            console.error('[cloud][proxy] 云函数返回失败：', fileID, JSON.stringify(res.result));
          }
          resolve(null);
        }
      },
      fail: (err) => {
        console.error('[cloud][proxy] 云函数调用失败：', fileID, JSON.stringify(err));
        resolve(null);
      },
    });
  });
}

/** 仅供测试/调试：清空代理本地缓存映射 */
export function __resetProxyCache(): void {
  proxyPathCache = {};
}
