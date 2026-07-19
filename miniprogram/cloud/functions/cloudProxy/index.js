/**
 * cloudProxy 云函数 —— 以「服务端管理员身份」读取云存储文件内容并返回，
 * 彻底绕过云存储「仅创建者可读写」安全规则导致的小程序端
 * wx.cloud.downloadFile 报 -403003 empty download url 的问题。
 *
 * 为什么可行：
 *   - wx.cloud.callFunction 调用本身免「服务器域名白名单」限制；
 *   - wx-server-sdk 的 cloud.downloadFile 以管理员身份读取，无视存储读安全规则；
 *   - 文件内容以 base64 经 callFunction 结果返回，小程序端写入本地文件即可显示/播放。
 *
 * 调用方：miniprogram/src/platform/cloudFile.ts 的 fetchViaCloudProxy()
 * 入参：{ fileID: "cloud://<env>.<suffix>/images/words/cat.png" }
 * 返回：{ ok:true, contentType:"image/png", base64:"..." }
 *       { ok:false, error:"..." }
 *
 * 部署：在微信开发者工具 / 云开发控制台「云函数」中上传并部署此目录一次。
 */
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/** 单次返回的原始字节上限，避免超出云函数返回报文限制、拖垮内存 */
const MAX_BYTES = 4 * 1024 * 1024; // 4MB

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
};

exports.main = async (event) => {
  const fileID = (event && event.fileID) || '';
  if (!fileID || !fileID.startsWith('cloud://')) {
    return { ok: false, error: 'missing or invalid fileID' };
  }
  try {
    const res = await cloud.downloadFile({ fileID });
    const buf = res && res.fileContent;
    if (!buf || !Buffer.isBuffer(buf)) {
      return { ok: false, error: 'empty file content' };
    }
    if (buf.length > MAX_BYTES) {
      return { ok: false, error: `file too large: ${buf.length} bytes` };
    }
    const dot = fileID.lastIndexOf('.');
    const ext = dot >= 0 ? fileID.slice(dot).toLowerCase() : '';
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    return { ok: true, contentType, base64: buf.toString('base64') };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
};
