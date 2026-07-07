/**
 * 数独引擎：纯逻辑、无副作用、可确定性复现（依赖种子 RNG）。
 * 所有题目生成与求解都基于回溯 + 种子随机，相同 seed 产生相同结果。
 */
import type { Board, Cage, Cell, SudokuSize } from './types';

/**
 * mulberry32 —— 确定性种子伪随机数发生器。
 * 相同 seed 产生相同序列，用于可复现的题目生成。
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 用种子随机做 Fisher-Yates 洗牌，返回新数组（不修改入参）。 */
function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/** 创建全空棋盘（所有格 value=null, given=false）。 */
export function emptyBoard(size: SudokuSize): Board {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ value: null, given: false } as Cell)),
  );
}

/** 深拷贝棋盘（value 与 given 同时拷贝）。 */
export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ value: cell.value, given: cell.given })));
}

/** 根据尺寸返回宫的行列划分。 */
function boxDims(size: number): { rows: number; cols: number } {
  if (size === 9) return { rows: 3, cols: 3 };
  if (size === 6) return { rows: 2, cols: 3 };
  const s = Math.round(Math.sqrt(size));
  return { rows: s, cols: s };
}

/**
 * 判断在 (r,c) 放 val 后，行/列/宫是否无重复（忽略 null 与自身所在格）。
 * 被题目生成、求解与校验共用。
 */
function canPlace(board: Board, size: number, r: number, c: number, val: number): boolean {
  for (let i = 0; i < size; i++) {
    if (i !== c && board[r][i].value === val) return false;
    if (i !== r && board[i][c].value === val) return false;
  }
  const { rows, cols } = boxDims(size);
  const br = Math.floor(r / rows) * rows;
  const bc = Math.floor(c / cols) * cols;
  for (let rr = br; rr < br + rows; rr++) {
    for (let cc = bc; cc < bc + cols; cc++) {
      if ((rr !== r || cc !== c) && board[rr][cc].value === val) return false;
    }
  }
  return true;
}

/** 回溯填满空棋盘，候选按种子洗牌。返回是否成功（理论恒为真）。 */
function fillBoard(board: Board, size: number, rng: () => number): boolean {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c].value === null) {
        const candidates = shuffle(
          Array.from({ length: size }, (_, i) => i + 1),
          rng,
        );
        for (const val of candidates) {
          if (canPlace(board, size, r, c, val)) {
            board[r][c].value = val;
            if (fillBoard(board, size, rng)) return true;
            board[r][c].value = null;
          }
        }
        return false;
      }
    }
  }
  return true;
}

/**
 * 统计解的个数，达到 limit 即早停（用于唯一解判定）。
 * 返回实际解数，但不超过 limit。
 */
export function countSolutions(board: Board, limit = 2): number {
  const size = board.length;
  const work = cloneBoard(board);
  let count = 0;
  const rec = (): void => {
    if (count >= limit) return;
    let fr = -1;
    let fc = -1;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (work[r][c].value === null) {
          fr = r;
          fc = c;
          break;
        }
      }
      if (fr !== -1) break;
    }
    if (fr === -1) {
      count++;
      return;
    }
    for (let val = 1; val <= size; val++) {
      if (count >= limit) return;
      if (canPlace(work, size, fr, fc, val)) {
        work[fr][fc].value = val;
        rec();
        work[fr][fc].value = null;
      }
    }
  };
  rec();
  return count;
}

/** 回溯求解（原地）。 */
function solveInPlace(board: Board, size: number): boolean {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c].value === null) {
        for (let val = 1; val <= size; val++) {
          if (canPlace(board, size, r, c, val)) {
            board[r][c].value = val;
            if (solveInPlace(board, size)) return true;
            board[r][c].value = null;
          }
        }
        return false;
      }
    }
  }
  return true;
}

/** 回溯求解，返回解棋盘；无解返回 null。 */
export function solve(board: Board): Board | null {
  const size = board.length;
  const work = cloneBoard(board);
  return solveInPlace(work, size) ? work : null;
}

/**
 * 生成数独题目。
 * - 先用回溯 + 洗牌候选（种子随机）生成完整 solution；
 * - 再依「唯一解」约束挖空：打乱全部格顺序，逐格尝试挖空，挖后若仍唯一解则保留，
 *   否则还原；最多挖 holes 个；given 标记该格是否预填。
 */
export function generateSudoku(
  size: SudokuSize,
  holes: number,
  seed?: number,
): { puzzle: Board; solution: Board } {
  const rng = mulberry32(seed ?? 1);
  const solution = emptyBoard(size);
  fillBoard(solution, size, rng);
  const puzzle: Board = solution.map((row) =>
    row.map((cell) => ({ value: cell.value, given: true })),
  );

  const target = Math.min(holes, size * size);
  const order = shuffle(
    Array.from({ length: size * size }, (_, i) => [Math.floor(i / size), i % size] as [number, number]),
    rng,
  );
  let removed = 0;
  for (const [r, c] of order) {
    if (removed >= target) break;
    const backup = puzzle[r][c].value;
    puzzle[r][c].value = null;
    puzzle[r][c].given = false;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[r][c].value = backup;
      puzzle[r][c].given = true;
    } else {
      removed++;
    }
  }
  return { puzzle, solution };
}

/**
 * 检查在 (r,c) 放 val 后是否合法（行/列/宫无重复，忽略空格与自身）。
 */
export function validateCell(board: Board, r: number, c: number, val: number): boolean {
  const size = board.length;
  return canPlace(board, size, r, c, val);
}

/** 棋盘是否已完成（无空格）且全盘合法。 */
export function isComplete(board: Board): boolean {
  const size = board.length;
  const dims = boxDims(size);
  const newSet = (): Set<number> => new Set<number>();

  for (let r = 0; r < size; r++) {
    const s = newSet();
    for (let c = 0; c < size; c++) {
      const v = board[r][c].value;
      if (v === null || s.has(v)) return false;
      s.add(v);
    }
  }
  for (let c = 0; c < size; c++) {
    const s = newSet();
    for (let r = 0; r < size; r++) {
      const v = board[r][c].value;
      if (v === null || s.has(v)) return false;
      s.add(v);
    }
  }
  for (let br = 0; br < size; br += dims.rows) {
    for (let bc = 0; bc < size; bc += dims.cols) {
      const s = newSet();
      for (let r = br; r < br + dims.rows; r++) {
        for (let c = bc; c < bc + dims.cols; c++) {
          const v = board[r][c].value;
          if (v === null || s.has(v)) return false;
          s.add(v);
        }
      }
    }
  }
  return true;
}

/**
 * 将棋盘划分为若干连续区域（每区 2-4 格），返回每区 cells 与 sum
 * （sum = 区内 solution 值之和）；保证每格恰属一区。相同 seed 可复现。
 */
export function makeCages(size: SudokuSize, solution: Board, seed?: number): Cage[] {
  const rng = mulberry32((seed ?? 7) ^ 0x9e3779b9);
  const owner: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(-1));
  const cages: Cage[] = [];
  const dirs: Array<[number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  let nextId = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (owner[r][c] !== -1) continue;
      const id = nextId++;
      const cells: Array<[number, number]> = [[r, c]];
      owner[r][c] = id;
      const target = 2 + Math.floor(rng() * 3); // 2,3,4
      while (cells.length < target) {
        const frontierSet = new Set<number>();
        const frontier: Array<[number, number]> = [];
        for (const [cr, cc] of cells) {
          for (const [dr, dc] of dirs) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
            if (owner[nr][nc] !== -1) continue;
            const key = nr * size + nc;
            if (!frontierSet.has(key)) {
              frontierSet.add(key);
              frontier.push([nr, nc]);
            }
          }
        }
        if (frontier.length === 0) break;
        const pick = frontier[Math.floor(rng() * frontier.length)];
        owner[pick[0]][pick[1]] = id;
        cells.push(pick);
      }
      const sum = cells.reduce((acc, [cr, cc]) => acc + (solution[cr][cc].value ?? 0), 0);
      cages.push({ id, cells, sum });
    }
  }

  // 合并落单（size=1）的 cage 到相邻 cage，保证每区 ≥2。
  let changed = true;
  while (changed) {
    changed = false;
    for (const cage of cages) {
      if (cage.cells.length >= 2) continue;
      const [sr, sc] = cage.cells[0];
      let targetCage: Cage | null = null;
      for (const [dr, dc] of dirs) {
        const nr = sr + dr;
        const nc = sc + dc;
        if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
        const adjId = owner[nr][nc];
        if (adjId === cage.id) continue;
        const adj = cages.find((x) => x.id === adjId && x.cells.length > 0);
        if (adj && adj.cells.length < 4) {
          targetCage = adj;
          break;
        }
      }
      if (!targetCage) {
        // 退回策略：并入任意相邻 cage（极端情况允许 >4）
        for (const [dr, dc] of dirs) {
          const nr = sr + dr;
          const nc = sc + dc;
          if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
          const adj = cages.find((x) => x.id === owner[nr][nc] && x.cells.length > 0);
          if (adj && adj.id !== cage.id) {
            targetCage = adj;
            break;
          }
        }
      }
      if (targetCage) {
        owner[sr][sc] = targetCage.id;
        targetCage.cells.push([sr, sc]);
        targetCage.sum += solution[sr][sc].value ?? 0;
        cage.cells = [];
        changed = true;
        break;
      }
    }
    if (changed) {
      for (let i = cages.length - 1; i >= 0; i--) {
        if (cages[i].cells.length === 0) cages.splice(i, 1);
      }
    }
  }

  return cages;
}

/**
 * 数字转字母：
 * - size=6：1→A … 6→F
 * - size=9：1→A … 9→I
 */
export function numberToLetter(n: number, size: SudokuSize): string {
  if (n < 1 || n > size) return '';
  return String.fromCharCode(64 + n);
}
