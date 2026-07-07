import hanziData from '../../../data/hanzi.json';
import { createRng, type Rng } from '../../../utils/rng';
import { shuffle } from '../../../utils/shuffle';

export interface HanziCard {
  char: string;
  pinyin: string;
  emoji: string;
  meaning: string;
}

export interface MemoryTile {
  id: number;
  card: HanziCard;
  pairKey: string;
}

export function getCards(): HanziCard[] {
  return (hanziData as { cards: HanziCard[] }).cards;
}

/** 从字表抽取 pairs 对，每对复制两张，洗牌后返回记忆卡片 */
export function buildMemoryTiles(pairs: number, seed = Date.now()): MemoryTile[] {
  const rng: Rng = createRng(seed);
  const cards = getCards();
  const chosen = shuffle(cards, rng).slice(0, Math.min(pairs, cards.length));
  const tiles: MemoryTile[] = [];
  let id = 0;
  for (const c of chosen) {
    tiles.push({ id: id++, card: c, pairKey: c.char });
    tiles.push({ id: id++, card: c, pairKey: c.char });
  }
  return shuffle(tiles, rng);
}
