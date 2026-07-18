/**
 * ProgressStore —— 游戏进度全局状态管理。
 *
 * 基于 zustand + persist 中间件实现：
 * - localStorage 持久化，附带 schema version，支持自动迁移；
 * - 跨标签页 storage 事件同步；
 * - 成就数据通过 Zod 校验 config.json，替代 `as unknown as`；
 * - API 完全向后兼容原有 useProgress() hook。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameResult } from '../games/types';
import configData from '../data/config.json';
import {
  ConfigSchema,
  type AchievementDef,
  type GameProgressRecord,
  type ProgressState,
  ProgressStateSchema,
  SAVE_VERSION,
} from '../data/schemas';
import { storage } from '../platform/storage';

// ---------------------------------------------------------------------------
// 类型导出（向后兼容）
// ---------------------------------------------------------------------------

export type { GameProgressRecord, AchievementDef, ProgressState };

export interface SaveInput extends GameResult {
  gameId: string;
  knowledgePoints?: string[];
  medals?: string[];
}

// ---------------------------------------------------------------------------
// 成就定义（从 config.json 加载，经 Zod 校验）
// ---------------------------------------------------------------------------

const config = ConfigSchema.parse(configData);
export const ACHIEVEMENTS: AchievementDef[] = config.achievements;

// ---------------------------------------------------------------------------
// 内部工具函数
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'yyx.progress.v2';

function emptyState(): ProgressState {
  return { records: {}, unlocked: [], totalStars: 0, recent: [], knowledgePoints: [], medals: [] };
}

function evaluateAchievements(s: ProgressState): string[] {
  const unlocked = new Set(s.unlocked);
  const recs = Object.values(s.records);

  if (recs.some((r) => r.stars >= 1)) unlocked.add('first-win');
  if (recs.some((r) => r.stars >= 3)) unlocked.add('star-three');
  if (recs.length >= 12) unlocked.add('explorer');

  const totalPlays = recs.reduce((sum, r) => sum + r.plays, 0);
  if (totalPlays >= 30) unlocked.add('persistent');

  if (recs.some((r) => r.stars >= 3 && r.plays >= 1)) unlocked.add('perfect');

  if (s.medals.length >= 1) unlocked.add('medal-first');
  if (s.medals.length >= 5) unlocked.add('medal-collector');
  if (s.knowledgePoints.length >= 10) unlocked.add('scholar');

  return Array.from(unlocked);
}

function uniqueConcat(a: readonly string[] = [], b: readonly string[] = []): string[] {
  const set = new Set(a);
  for (const x of b) set.add(x);
  return Array.from(set);
}

// ---------------------------------------------------------------------------
// Zustand Store（含 persist + 跨标签页同步）
// ---------------------------------------------------------------------------

interface ProgressStoreState extends ProgressState {
  saveResult: (input: SaveInput) => void;
  getRecord: (gameId: string) => GameProgressRecord | undefined;
  isUnlocked: (id: string) => boolean;
}

export const useProgressStore = create<ProgressStoreState>()(
  persist(
    (set, get) => ({
      ...emptyState(),

      saveResult: (input: SaveInput) => {
        set((prev) => {
          const p = prev as ProgressState;
          const existing = p.records[input.gameId];
          const next: GameProgressRecord = {
            gameId: input.gameId,
            bestScore: Math.max(existing?.bestScore ?? 0, input.score),
            stars: Math.max(existing?.stars ?? 0, input.stars),
            plays: (existing?.plays ?? 0) + 1,
            lastPlayed: Date.now(),
            knowledgePoints: uniqueConcat(existing?.knowledgePoints, input.knowledgePoints),
            medals: uniqueConcat(existing?.medals, input.medals),
          };
          const records = { ...p.records, [input.gameId]: next };
          const recent = [input.gameId, ...p.recent.filter((g) => g !== input.gameId)].slice(0, 6);
          const totalStars = Object.values(records).reduce((s, r) => s + r.stars, 0);
          const knowledgePoints = uniqueConcat(p.knowledgePoints, input.knowledgePoints);
          const medals = uniqueConcat(p.medals, input.medals);

          const base: ProgressState = { records, unlocked: p.unlocked, totalStars, recent, knowledgePoints, medals };
          return { ...base, unlocked: evaluateAchievements(base) };
        });
      },

      getRecord: (gameId: string) => get().records[gameId],

      isUnlocked: (id: string) => get().unlocked.includes(id),
    }),
    {
      name: STORAGE_KEY,
      version: SAVE_VERSION,
      // 自定义 storage 适配器：集成 Zod 校验 + 跨标签页同步
      storage: {
        getItem: () => {
          try {
            const raw = storage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const result = ProgressStateSchema.safeParse(parsed);
            if (result.success) {
              const { version: _v, ...state } = result.data;
              return { state, version: SAVE_VERSION };
            }
            // 解析失败不直接清空：把原始对象交给 migrate 尽力抢救
            return { state: parsed, version: -1 };
          } catch {
            return null;
          }
        },
        setItem: (_name, value) => {
          try {
            storage.setItem(
              STORAGE_KEY,
              JSON.stringify({ ...value.state, version: SAVE_VERSION }),
            );
          } catch {
            /* quota exceeded 静默降级 */
          }
        },
        removeItem: () => {
          try {
            storage.removeItem(STORAGE_KEY);
          } catch {
            /* ignore */
          }
        },
      },
      // 版本迁移：旧数据无 version 字段时，Zod 默认值填充；
      // 结构损坏时尽力抢救（而非静默清空全部进度）。
      migrate: (persisted: unknown, _version: number) => {
        const result = ProgressStateSchema.safeParse(persisted);
        if (result.success) {
          const { version: _v, ...state } = result.data;
          return state as ProgressStoreState;
        }
        // 抢救路径：逐条剥离可识别的记录与集合，丢弃无法解析的字段
        try {
          const raw = (persisted ?? {}) as Record<string, unknown>;
          const recordsRaw = (raw.records ?? {}) as Record<string, unknown>;
          const records: Record<string, GameProgressRecord> = {};
          let totalStars = 0;
          const knowledgePoints: string[] = [];
          const medals: string[] = [];
          const kpSet = new Set<string>();
          const mSet = new Set<string>();

          for (const [gameId, rec] of Object.entries(recordsRaw)) {
            if (!rec || typeof rec !== 'object') continue;
            const r = rec as Record<string, unknown>;
            const bestScore = Number(r.bestScore) || 0;
            const stars = Math.min(3, Math.max(0, Number(r.stars) || 0));
            const plays = Math.max(0, Number(r.plays) || 0);
            const kps = Array.isArray(r.knowledgePoints)
              ? (r.knowledgePoints as unknown[]).filter((x): x is string => typeof x === 'string')
              : [];
            const ms = Array.isArray(r.medals)
              ? (r.medals as unknown[]).filter((x): x is string => typeof x === 'string')
              : [];
            for (const k of kps) if (!kpSet.has(k)) { kpSet.add(k); knowledgePoints.push(k); }
            for (const m of ms) if (!mSet.has(m)) { mSet.add(m); medals.push(m); }
            totalStars += stars;
            records[gameId] = {
              gameId,
              bestScore,
              stars,
              plays,
              lastPlayed: Number(r.lastPlayed) || 0,
              knowledgePoints: kps,
              medals: ms,
            };
          }

          const base: ProgressState = {
            records,
            unlocked: Array.isArray(raw.unlocked)
              ? (raw.unlocked as unknown[]).filter((x): x is string => typeof x === 'string')
              : [],
            totalStars,
            recent: Array.isArray(raw.recent)
              ? (raw.recent as unknown[]).filter((x): x is string => typeof x === 'string')
              : [],
            knowledgePoints,
            medals,
          };
          return { ...base, unlocked: evaluateAchievements(base) } as ProgressStoreState;
        } catch {
          // 极端损坏（非对象）才降级为空白态，绝大多数场景已抢救
          return emptyState() as ProgressStoreState;
        }
      },
      // 跨标签页同步（仅 Web 端，小程序无 storage 事件）
      onRehydrateStorage: () => {
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
          return () => {};
        }
        const handler = (e: StorageEvent) => {
          if (e.key === STORAGE_KEY && e.newValue) {
            try {
              const parsed = JSON.parse(e.newValue);
              const result = ProgressStateSchema.safeParse(parsed);
              if (result.success) {
                const { version: _v, ...state } = result.data;
                useProgressStore.setState(state);
              }
            } catch {
              /* ignore */
            }
          }
        };
        window.addEventListener('storage', handler);
        return () => {
          window.removeEventListener('storage', handler);
        };
      },
    },
  ),
);

/**
 * useProgress —— 游戏进度 Hook。
 *
 * API 与原实现完全向后兼容。
 */
export function useProgress() {
  return useProgressStore();
}
