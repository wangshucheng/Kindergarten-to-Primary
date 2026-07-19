import { Image, Text } from '@tarojs/components';
import { useEffect, useState } from 'react';
import { getTempFileUrl } from '../platform/cloudFile';

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
 * 云图片组件：把 cloud:// 文件 ID 解析为临时 URL 后交给 <Image>。
 *
 * - 小程序环境：通过 wx.cloud.getTempFileURL 换取带临时凭证的 URL（无需公开读权限）
 * - Web 环境 / 相对路径：直接透传给 <Image>（加载 public/ 本地资源）
 * - 解析失败或图片加载失败：回退显示 emoji，不再破图、不再刷 403 报错
 */
export function CloudImage({ fileId, emoji, alt, className }: CloudImageProps) {
  const [tempUrl, setTempUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setTempUrl(null);
    if (!fileId) {
      setTempUrl(null);
      return;
    }
    getTempFileUrl(fileId).then((url) => {
      if (!cancelled) setTempUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  if (!fileId || !tempUrl || failed) {
    return emoji ? <Text className={className ?? 'text-4xl leading-none'}>{emoji}</Text> : null;
  }

  return (
    <Image
      src={tempUrl}
      alt={alt}
      className={className}
      mode="aspectFill"
      onError={() => setFailed(true)}
    />
  );
}

export default CloudImage;
