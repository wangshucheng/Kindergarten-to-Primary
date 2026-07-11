/**
 * gooseCatchLogic —— 抓大鹅纯逻辑（不依赖 React，可单测）。
 *
 * 回合制目标配对玩法：
 * - 汉字模式：key = 拼音，text = 代表字，知识点 = `pinyin:xx`
 * - 英语模式：key = category，text = 代表词，知识点 = `category:xx`
 * - 每轮显示一个目标 key，棋盘上有多个方块，玩家点击匹配的方块即得分。
 */
import type { CardTone } from '../../../components/Card';
import type { Rng } from '../../../utils/rng';
import { createRng } from '../../../utils/rng';
import { shuffle } from '../../../utils/shuffle';
import { QuestionGenerator, type HanziQuestion } from '../../../data/generators';
import { vocabThemeTiles } from '../../../data/vocabTiles';

/** 棋盘上的一块鹅 */
export interface GooseTile {
  /** 匹配键：汉字=拼音；英语=category */
  key: string;
  /** 主显示：汉字 / 单词 */
  label: string;
  /** 副显示：拼音 / 释义 */
  sub?: string;
  /** 表情 / 图标 */
  emoji?: string;
  /** 含义 */
  meaning?: string;
  /** 知识点 id（如 `pinyin:ai` / `category:color`） */
  knowledgePoint: string;
  /** 视觉色调 */
  tone: CardTone;
}

export type GooseSubject = 'hanzi' | 'english';

export interface GooseLevel {
  index: number;
  /** 本关总轮数 */
  rounds: number;
  /** 每轮展示的 tile 数（1 正确 + N 干扰） */
  tilesPerRound: number;
  /** 本关目标分 */
  targetScore: number;
  /** 本关失误上限 */
  mistakeLimit: number;
  title: string;
}

/** 三关难度梯度。
 *  H1 修复：targetScore 必须 ≤ rounds×10（每轮正确 +10），否则数学上永远无法通关。
 *  这里取 40/60/80（分别对应 6/8/10 轮满分 60/80/100 的 2/3 阈值），保证任意一关、
 *  任意一轮在失误未超上限时均可达成「全轮答对 → 总分 ≥ 目标分」而通关。 */
export const GOOSE_LEVELS: GooseLevel[] = [
  { index: 0, rounds: 6, tilesPerRound: 4, targetScore: 40, mistakeLimit: 3, title: '第 1 关 · 启蒙' },
  { index: 1, rounds: 8, tilesPerRound: 6, targetScore: 60, mistakeLimit: 4, title: '第 2 关 · 进阶' },
  { index: 2, rounds: 10, tilesPerRound: 8, targetScore: 80, mistakeLimit: 5, title: '第 3 关 · 挑战' },
];

const TONES: CardTone[] = ['peach', 'mint', 'sky', 'lemon', 'cream'];

function toneFor(key: string): CardTone {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

/**
 * 构建 tile 素材池。
 * 汉字模式按拼音去重（distinct pinyin keys），英语模式按 category 去重。
 * 每个 distinct key 保留一个代表 tile。
 */
export function buildPool(subject: GooseSubject, seed: number): GooseTile[] {
  const rng = createRng(seed);
  if (subject === 'english') {
    // 统一从 VOCAB 取词：按 theme 去重，word/meaning 来自 VOCAB，
    // emoji 回退至 english.json 原图或主题 emoji。
    return shuffle(
      vocabThemeTiles(50, seed).map((t) => ({ ...t, meaning: t.sub, tone: toneFor(t.key) })),
      rng,
    );
  }
  const qs: HanziQuestion[] = QuestionGenerator.hanzi({ level: 1, mode: 'char-pinyin', count: 50, seed });
  const seen = new Set<string>();
  const tiles: GooseTile[] = [];
  for (const q of shuffle(qs, rng)) {
    const py = q.pinyin;
    if (seen.has(py)) continue;
    seen.add(py);
    tiles.push({
      key: py,
      label: q.char,
      sub: q.pinyin,
      emoji: q.emoji,
      meaning: q.meaning,
      // M4：知识点统一为 `hanzi:字`（与 genHanzi 契约一致，避免同音字合并失真）
      knowledgePoint: `hanzi:${q.char}`,
      tone: toneFor(py),
    });
  }
  return tiles;
}

/**
 * 为某一轮构建展示的 tile 列表。
 * @param pool 素材池
 * @param targetKey 当前轮的目标匹配键
 * @param distractorKeys 干扰键列表
 * @param rng 随机源
 * @returns 乱序后的 GooseTile[]（1 正确 + distractorKeys.length 个干扰）
 */
export function buildRound(
  pool: GooseTile[],
  targetKey: string,
  distractorKeys: string[],
  rng: Rng,
): GooseTile[] {
  const correct = pool.find((t) => t.key === targetKey);
  if (!correct) {
    // 目标 tile 不在池中。生成一个占位 tile（实际不应出现）
    return [
      { key: targetKey, label: '?', sub: targetKey, knowledgePoint: `unknown:${targetKey}`, tone: 'white' },
    ];
  }
  const tiles: GooseTile[] = [{ ...correct }];
  for (const dk of distractorKeys) {
    const dt = pool.find((t) => t.key === dk);
    if (dt) tiles.push({ ...dt });
  }
  return shuffle(tiles, rng);
}

/** 判定 tile 是否与目标键匹配 */
export function isMatch(tile: GooseTile, targetKey: string): boolean {
  return tile.key === targetKey;
}

/**
 * 计算单轮匹配得分。
 * @param _round 轮次序号（预留，未使用）
 * @param correct 是否匹配正确
 */
export function roundScore(_round: number, correct: boolean): number {
  return correct ? 10 : 0;
}
