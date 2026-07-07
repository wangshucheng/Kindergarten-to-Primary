/**
 * 数独进度持久化（localStorage）。
 * 负责：6×6 通关后解锁 9×9、记录各玩法最佳成绩（星级 / 用时）。
 */
const UNLOCK_KEY = 'youxiao-sudoku-unlock';
const BEST_KEY = 'youxiao-sudoku-best';

/** 单条最佳成绩。 */
export interface BestEntry {
  stars: number;
  durationMs: number;
}

/** 解锁与最佳成绩状态。 */
export interface UnlockState {
  nineUnlocked: boolean;
  best: Record<string, BestEntry>;
}

/** 读取解锁状态与最佳成绩。 */
export function loadUnlock(): UnlockState {
  let nineUnlocked = false;
  try {
    nineUnlocked = localStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    nineUnlocked = false;
  }

  let best: Record<string, BestEntry> = {};
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (raw) best = JSON.parse(raw) as Record<string, BestEntry>;
  } catch {
    best = {};
  }

  return { nineUnlocked, best };
}

/** 首次完成 6×6 后调用，写入解锁标记。 */
export function unlockNine(): void {
  try {
    localStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    /* 忽略存储异常（如隐私模式） */
  }
}

/**
 * 保存某玩法的最佳成绩：星级更高优先；星级相同则用时更短优先。
 */
export function saveBest(gameKey: string, stars: number, durationMs: number): void {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const best: Record<string, BestEntry> = raw ? (JSON.parse(raw) as Record<string, BestEntry>) : {};
    const prev = best[gameKey];
    if (!prev || stars > prev.stars || (stars === prev.stars && durationMs < prev.durationMs)) {
      best[gameKey] = { stars, durationMs };
      localStorage.setItem(BEST_KEY, JSON.stringify(best));
    }
  } catch {
    /* 忽略存储异常 */
  }
}
