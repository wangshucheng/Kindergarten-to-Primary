/**
 * matchDetector —— 纯逻辑：三连判定 / 相邻判定 / 连续段查找。
 * 不依赖 React，可直接单测。供消消乐、砖了个砖等玩法复用。
 */
export interface Coord {
  row: number;
  col: number;
}

function defaultEq<T>(a: T, b: T): boolean {
  return a === b;
}

/**
 * 在一维序列中查找相邻相等元素的连续段（长度 >= 2）。
 * 返回每段的下标数组（如 [[0,1,2],[5,6]]）。
 */
export function findRuns<T>(line: T[], eq: (a: T, b: T) => boolean = defaultEq): number[][] {
  const runs: number[][] = [];
  if (line.length === 0) return runs;
  let start = 0;
  for (let i = 1; i <= line.length; i++) {
    if (i === line.length || !eq(line[i], line[i - 1])) {
      if (i - start >= 2) {
        const run: number[] = [];
        for (let k = start; k < i; k++) run.push(k);
        runs.push(run);
      }
      start = i;
    }
  }
  return runs;
}

/**
 * 在二维网格中检测三连（横/竖连续 >= 3 个相等）。
 * 返回所有参与三连的格子坐标（去重）。
 */
export function detectMatch3<T>(
  grid: T[][],
  eq: (a: T, b: T) => boolean = defaultEq,
): Coord[] {
  const matched = new Set<string>();
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  for (let r = 0; r < rows; r++) {
    const runs = findRuns(grid[r] ?? [], eq);
    for (const run of runs) {
      if (run.length >= 3) for (const c of run) matched.add(`${r},${c}`);
    }
  }
  for (let c = 0; c < cols; c++) {
    const colLine: T[] = [];
    for (let r = 0; r < rows; r++) colLine.push(grid[r][c]);
    const runs = findRuns(colLine, eq);
    for (const run of runs) {
      if (run.length >= 3) for (const r of run) matched.add(`${r},${c}`);
    }
  }

  return Array.from(matched).map((s) => {
    const [r, c] = s.split(',').map(Number);
    return { row: r, col: c };
  });
}

/** 判断两格是否正交相邻（曼哈顿距离 == 1） */
export function isAdjacent(a: Coord, b: Coord): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr + dc === 1;
}
