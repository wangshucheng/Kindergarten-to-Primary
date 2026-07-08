import { createRng, randomInt, type Rng } from '../../../utils/rng';
import { shuffle } from '../../../utils/shuffle';

export interface MakeTenTile {
  id: number;
  value: number;
  emoji: string;
  layer: number;
  x: number;
  y: number;
}

export interface MakeTenLevel {
  rows: number;
  cols: number;
  layers: number;
  pairsPerLayer: number;
}

export interface BoardState {
  tiles: MakeTenTile[];
  pairsTotal: number;
}

const TILE_EMOJI: Record<number, string> = {
  1: '1️⃣',
  2: '2️⃣',
  3: '3️⃣',
  4: '4️⃣',
  5: '5️⃣',
  6: '6️⃣',
  7: '7️⃣',
  8: '8️⃣',
  9: '9️⃣',
};

/** 生成一局“凑十法”棋盘：每层都是若干“和为10”的配对，层叠遮挡。 */
export function generateBoard(level: MakeTenLevel, seed = Date.now()): BoardState {
  const rng: Rng = createRng(seed);
  const tiles: MakeTenTile[] = [];
  let id = 0;
  let pairsTotal = 0;

  for (let L = 0; L < level.layers; L++) {
    const slotsX = Math.max(1, level.cols - L);
    const slotsY = Math.max(1, level.rows - L);
    const slots = slotsX * slotsY;
    const pairs = Math.min(level.pairsPerLayer, Math.floor(slots / 2));
    pairsTotal += pairs;

    const positions: { x: number; y: number }[] = [];
    for (let y = 0; y < slotsY; y++) {
      for (let x = 0; x < slotsX; x++) {
        positions.push({ x: x + L * 0.5, y: y + L * 0.5 });
      }
    }
    const chosen = shuffle(positions, rng).slice(0, pairs * 2);
    for (let i = 0; i < pairs; i++) {
      const a = randomInt(rng, 1, 9);
      const b = 10 - a;
      const p1 = chosen[i * 2];
      const p2 = chosen[i * 2 + 1];
      tiles.push({ id: id++, value: a, emoji: TILE_EMOJI[a], layer: L, x: p1.x, y: p1.y });
      tiles.push({ id: id++, value: b, emoji: TILE_EMOJI[b], layer: L, x: p2.x, y: p2.y });
    }
  }

  return { tiles, pairsTotal };
}

/** 判断 tile 是否被更高层的卡片遮挡 */
export function isCovered(
  living: MakeTenTile[],
  tile: MakeTenTile,
): boolean {
  return living.some(
    (t) =>
      t.id !== tile.id &&
      t.layer > tile.layer &&
      Math.abs(t.x - tile.x) < 0.9 &&
      Math.abs(t.y - tile.y) < 0.9,
  );
}

/** 计算当前可点击（未被遮挡）的卡片 id 集合 */
export function freeTileIds(tiles: MakeTenTile[], removed: Set<number>): Set<number> {
  const living = tiles.filter((t) => !removed.has(t.id));
  const free = new Set<number>();
  for (const t of living) {
    if (!isCovered(living, t)) free.add(t.id);
  }
  return free;
}

/** 判断当前可点击（未被遮挡）卡片中是否还存在能凑成 10 的两个不同卡片 */
export function hasTenPair(tiles: MakeTenTile[], removed: Set<number>): boolean {
  const freeIds = freeTileIds(tiles, removed);
  const free = tiles.filter((t) => freeIds.has(t.id));
  const seen = new Set<number>();
  for (const t of free) {
    const need = 10 - t.value;
    if (seen.has(need)) return true;
    seen.add(t.value);
  }
  return false;
}
