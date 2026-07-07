import { useEffect, useState } from 'react';

/**
 * useLocalStorage —— 与 localStorage 同步的 state。
 * 用于轻量存档（成就/进度）。写入失败（隐私模式等）时静默降级为内存态。
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)): void => {
    setStored((prev) => {
      const next = value instanceof Function ? value(prev) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* 忽略写入异常 */
      }
      return next;
    });
  };

  // 多标签页同步
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === key && e.newValue) {
        try {
          setStored(JSON.parse(e.newValue) as T);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return [stored, setValue];
}
