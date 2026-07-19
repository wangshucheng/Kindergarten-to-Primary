/**
 * 云存储资源配置 —— 集中管理音频/图片的云端 URL。
 *
 * 504 张单词图片（约 85MB）和 504 个单词音频（约 11.3MB）
 * 必须上传到云存储/CDN（小程序总包限制 20MB，主包限制 2MB）。
 *
 * 部署步骤：
 *   1. 上传 public/audio/words/*.mp3 到 CDN
 *   2. 上传 public/images/words/*.png 到 CDN
 *   3. 修改下面的 CLOUD_AUDIO_BASE_URL / CLOUD_IMAGE_BASE_URL 为实际 CDN 地址
 *   4. 重新构建小程序
 *
 * 未配置（空字符串）时：
 *   - 音频：TTS 静默跳过（无声音但 onEnd 立即触发）
 *   - 图片：getWordImage 返回相对路径，小程序 <Image> 加载失败会显示回退 emoji
 */

/** 音频 CDN 基础 URL（结尾不含斜杠，会自动补） */
export const CLOUD_AUDIO_BASE_URL = 'https://636c-cloud1-d5g2o67hb3101ab8a-1455652056.tcb.qcloud.la/audio/words/';

/** 图片 CDN 基础 URL（结尾不含斜杠，会自动补） */
export const CLOUD_IMAGE_BASE_URL = 'https://636c-cloud1-d5g2o67hb3101ab8a-1455652056.tcb.qcloud.la/images/words/';
