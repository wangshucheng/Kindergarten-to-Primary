import { Image, Text } from '@tarojs/components';
import { useEffect, useState } from 'react';
import { fetchViaCloudProxy } from '../platform/cloudFile';

interface CloudImageProps {
  /** cloud:// 文件 ID，或 http(s) 链接，或相对路径；为空时不渲染图片 */
  fileId?: string | null;
  /** 加载中 / 加载失败时显示的回退 emoji */
  emoji?: string;
  /** 无障碍替代文本 */
  alt?: string;
  className?: string;
}

/**
 * 云图片组件：把 cloud:// 文件 ID 解析为本地临时文件后交给 <Image>。
 *
 * 关键设计：图片走 wx.cloud.downloadFile 下载到本地临时文件，再交给 <Image>。
 * 相比 getTempFileURL 返回远程 HTTPS URL 的方案，downloadFile 属于云开发接口，
 * 不受小程序「downloadFile 合法域名」白名单限制，避免「临时 URL 域名未加白名单
 * 导致图片加载失败」这一类常见坑（音频侧已是相同做法）。
 *
 * - 小程序环境 cloud:// 文件 ID：downloadFile → 本地临时路径 → <Image>
 * - 非 cloud://（Web 端相对路径 / http(s) 链接）：直接透传给 <Image>
 * - 解析失败或图片加载失败：回退显示 emoji，不再破图
 */

/** fileID → 本地临时路径缓存（避免重复下载） */
let localPathCache: Record<string, string> = {};

/** 是否处于可用的微信云开发环境 */
function isCloudAvailable(): boolean {
  return (
    typeof wx !== 'undefined' &&
    typeof wx.cloud !== 'undefined' &&
    typeof wx.cloud.downloadFile === 'function'
  );
}

/** 把 cloud:// 文件 ID 下载为本地文件路径（经 cloudProxy 云函数，绕过读权限） */
function downloadToLocal(fileID: string): Promise<string | null> {
  if (localPathCache[fileID]) return Promise.resolve(localPathCache[fileID]);
  if (!isCloudAvailable()) {
    console.error('[cloud][image] 云不可用，无法下载图片：', fileID);
    return Promise.resolve(null);
  }
  // 云存储读安全规则不可改（仅创建者可读写），小程序访客直连必被 -403003 拦截，
  // 故直接经 cloudProxy 云函数（服务端管理员身份）读取，无需先尝试直连。
  return fetchViaCloudProxy(fileID).then((p) => {
    if (p) {
      localPathCache[fileID] = p;
    } else {
      console.error('[cloud][image] 云函数代理取回失败：', fileID);
    }
    return p;
  });
}

export function CloudImage({ fileId, emoji, alt, className }: CloudImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setSrc(null);
    if (!fileId) {
      return;
    }
    // 非云文件 ID：直接作为图片源（Web 端相对路径 / 远程链接）
    if (!fileId.startsWith('cloud://')) {
      setSrc(fileId);
      return;
    }
    downloadToLocal(fileId).then((path) => {
      if (!cancelled) setSrc(path);
    });
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  if (!fileId || !src || failed) {
    return emoji ? <Text className={className ?? 'text-4xl leading-none'}>{emoji}</Text> : null;
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      mode="aspectFill"
      onError={() => setFailed(true)}
    />
  );
}

export default CloudImage;
