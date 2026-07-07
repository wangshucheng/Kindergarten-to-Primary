import { useCallback, useEffect, useState } from 'react';
import type { GameResult } from '../games/types';
import configData from '../data/config.json';

const STORAGE_KEY = 'yyx.progress.v1';

export interface GameProgressRecord {
  gameId: string;
  bestScore: number;
  stars: number;
  plays: number;
  lastPlayed: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export interface ProgressState {
  records: Record<string, GameProgressRecord>;
  unlocked: string[];
  totalStars: number;
  recent: string[];
}

export interface SaveInput extends GameResult {
  gameId: string;
}

interface ConfigShape {
  achievements?: AchievementDef[];
}

const config = configData as unknown as ConfigShape;
export const ACHIEVEMENTS: AchievementDef[] = config.achievements ?? [];

function emptyState(): ProgressState {
  return { records: {}, unlocked: [], totalStars: 0, recent: [] };
}

function load(): ProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as ProgressState;
    return {
      records: parsed.records ?? {},
      unlocked: parsed.unlocked ?? [],
      totalStars: parsed.totalStars ?? 0,
      recent: parsed.recent ?? [],
    };
  } catch {
    return emptyState();
  }
}

function persist(state: ProgressState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 忽略 */
  }
}

/**
 * 根据已有记录评估应解锁的成就（数据驱动 + 规则求值）。
 * 成就定义在 data/config.json，具体解锁条件在此集中实现。
 */
function evaluateAchievements(state: ProgressState): string[] {
  const unlocked = new Set(state.unlocked);
  const records = Object.values(state.records);

  const wonAny = records.some((r) => r.stars >= 1);
  if (wonAny) unlocked.add('first-win');

  const threeStarAny = records.some((r) => r.stars >= 3);
  if (threeStarAny) unlocked.add('star-three');

  const allPlayed = records.length >= 12;
  if (allPlayed) unlocked.add('explorer');

  const totalPlays = records.reduce((s, r) => s + r.plays, 0);
  if (totalPlays >= 30) unlocked.add('persistent');

  const perfect = records.some((r) => r.stars >= 3 && r.plays >= 1);
  if (perfect) unlocked.add('perfect');

  return Array.from(unlocked);
}

function applyResult(state: ProgressState, input: SaveInput): ProgressState {
  const prev = state.records[input.gameId];
  const nextRecord: GameProgressRecord = {
    gameId: input.gameId,
    bestScore: Math.max(prev?.bestScore ?? 0, input.score),
    stars: Math.max(prev?.stars ?? 0, input.stars),
    plays: (prev?.plays ?? 0) + 1,
    lastPlayed: Date.now(),
  };
  const records = { ...state.records, [input.gameId]: nextRecord };
  const recent = [input.gameId, ...state.recent.filter((g) => g !== input.gameId)].slice(0, 6);
  const totalStars = Object.values(records).reduce((s, r) => s + r.stars, 0);

  let next: ProgressState = { records, unlocked: state.unlocked, totalStars, recent };
  next = { ...next, unlocked: evaluateAchievements(next) };
  return next;
}

/**
 * useProgress —— 轻量存档 Hook（P2）。
 * 读取/保存游戏结果到 localStorage，并提供星星总数、最近游玩与成就。
 */
export function useProgress() {
  const [state, setState] = useState<ProgressState>(() => load());

  useEffect(() => {
    // 首次挂载时再评估一次（处理直接写入的情况）
    setState((s) => ({ ...s, unlocked: evaluateAchievements(s) }));
  }, []);

  const saveResult = useCallback((input: SaveInput) => {
    setState((prev) => {
      const next = applyResult(prev, input);
      persist(next);
      return next;
    });
  }, []);

  const getRecord = useCallback(
    (gameId: string): GameProgressRecord | undefined => state.records[gameId],
    [state.records],
  );

  const isUnlocked = useCallback(
    (id: string): boolean => state.unlocked.includes(id),
    [state.unlocked],
  );

  return {
    ...state,
    saveResult,
    getRecord,
    isUnlocked,
  };
}

export default useProgress;
