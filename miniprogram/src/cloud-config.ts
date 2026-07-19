/**
 * 云存储配置 —— 集中管理云环境 ID 与云文件 ID（cloud://）前缀。
 *
 * 504 张单词图片（约 85MB）和 504 个单词音频（约 11.3MB）
 * 必须上传到微信云存储（小程序总包限制 20MB，主包限制 2MB）。
 *
 * 资源访问采用「签名临时凭证」方案，无需把文件设为公开读：
 *   - 图片：wx.cloud.downloadFile(fileID) 下载到本地临时文件给 <Image>（免域名白名单）
 *   - 音频：wx.cloud.downloadFile(fileID) 直接下载到本地播放
 * 两者都基于 cloud:// 文件 ID，由 wx.cloud 自动签发临时凭证，
 * 因此云存储目录保持「仅创建者可读写」即可，规避 403 问题。
 *
 * 部署步骤：
 *   1. 上传 public/audio/words/*.mp3 到云存储 audio/words/
 *   2. 上传 public/images/words/*.png 到云存储 images/words/
 *   3. 确认下面的 CLOUD_ENV / CLOUD_FILE_ID_PREFIX 与你的云环境一致
 *      （文件 ID 前缀可在云开发控制台「存储」里点击任意文件查看其 fileID）
 *   4. 重新构建小程序
 *
 * 注意：wx.cloud.init 必须在 app.ts 启动时调用一次（见 app.ts）。
 */

/** 云开发环境 ID */
export const CLOUD_ENV = 'cloud1-d5g2o67hb3101ab8a';

/**
 * 云存储文件 ID 前缀（cloud:// 协议）。
 * 形如 cloud://<envId>.<fileIdSuffix>/
 * 对应公共域名：https://636c-cloud1-d5g2o67hb3101ab8a-1455652056.tcb.qcloud.la/
 * 可在云开发控制台「存储」点击文件复制其 fileID 前缀来核对。
 */
export const CLOUD_FILE_ID_PREFIX =
  'cloud://cloud1-d5g2o67hb3101ab8a.636c-cloud1-d5g2o67hb3101ab8a-1455652056/';

/** 拼接得到某个单词图片的 cloud file ID（如 word-images.json 的 rel 含 /images/words/xxx.png） */
export function buildImageFileId(rel: string): string {
  // rel 形如 "/images/words/cat.png"，去掉前导斜杠后拼接前缀
  return CLOUD_FILE_ID_PREFIX + rel.replace(/^\//, '');
}

/** 拼接得到某个音频的 cloud file ID（rel 形如 "/audio/words/xxx.mp3" 或 "/audio/zh/<hash>.mp3"） */
export function buildAudioFileId(rel: string): string {
  return CLOUD_FILE_ID_PREFIX + rel.replace(/^\//, '');
}
