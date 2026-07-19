export type Dir = 'up' | 'down' | 'left' | 'right';

export interface MergeState {
  size: number;
  board: number[][];
  score: number;
  won: boolean;
  over: boolean;
  target: number;
}

function emptyBoard(size: number): number[][] {
  return Array.from({ length: size }, () => Array<number>(size).fill(0));
}

function spawnTile(board: number[][]): number[][] {
  const empties: [number, number][] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board.length; c++) {
      if (board[r][c] === 0) empties.push([r, c]);
    }
  }
  if (empties.length === 0) return board;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const next = board.map((row) => row.slice());
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

export function createBoard(size: number, target: number): MergeState {
  let b = emptyBoard(size);
  b = spawnTile(b);
  b = spawnTile(b);
  return { size, board: b, score: 0, won: false, over: false, target };
}

/** 向左压缩并合并一行，返回新行与本次得分 */
function slideLine(line: number[]): { line: number[]; gained: number } {
  const arr = line.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  let i = 0;
  while (i < arr.length) {
    if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
      const merged = arr[i] * 2;
      out.push(merged);
      gained += merged;
      i += 2;
    } else {
      out.push(arr[i]);
      i += 1;
    }
  }
  while (out.length < line.length) out.push(0);
  return { line: out, gained };
}

function transpose(b: number[][]): number[][] {
  return b[0].map((_, c) => b.map((r) => r[c]));
}
function reverseRows(b: number[][]): number[][] {
  return b.map((r) => r.slice().reverse());
}

/** 执行一次移动，返回新状态（无变化则原样返回） */
export function move(state: MergeState, dir: Dir): MergeState {
  if (state.over) return state;
  const apply = (rows: number[][]): { rows: number[][]; gained: number } => {
    let g = 0;
    const out = rows.map((row) => {
      const res = slideLine(row);
      g += res.gained;
      return res.line;
    });
    return { rows: out, gained: g };
  };

  let board = state.board.map((r) => r.slice());
  let gained = 0;

  if (dir === 'left') {
    const r = apply(board);
    board = r.rows;
    gained = r.gained;
  } else if (dir === 'right') {
    let rev = reverseRows(board);
    const r = apply(rev);
    rev = r.rows;
    gained = r.gained;
    board = reverseRows(rev);
  } else if (dir === 'up') {
    let t = transpose(board);
    const r = apply(t);
    t = r.rows;
    gained = r.gained;
    board = transpose(t);
  } else {
    let t = transpose(board);
    let rev = reverseRows(t);
    const r = apply(rev);
    rev = r.rows;
    gained = r.gained;
    t = reverseRows(rev);
    board = transpose(t);
  }

  const changed = JSON.stringify(board) !== JSON.stringify(state.board);
  if (!changed) return state;

  board = spawnTile(board);
  const score = state.score + gained;
  const maxTile = Math.max(...board.flat());
  const won = state.won || maxTile >= state.target;
  const over = !canMove(board);
  return { size: state.size, board, score, won, over, target: state.target };
}

/** 是否还能继续移动 */
export function canMove(board: number[][]): boolean {
  const n = board.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c] === 0) return true;
      if (c + 1 < n && board[r][c] === board[r][c + 1]) return true;
      if (r + 1 < n && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

/** 数字 → 背景色（马卡龙风格） */
export function tileColor(value: number): string {
  const map: Record<number, string> = {
    0: '#FFF3E6',
    2: '#FBE9D6',
    4: '#F6D9B8',
    8: '#F7B27A',
    16: '#F59357',
    32: '#F2784E',
    64: '#EE5E36',
    128: '#F4CE6A',
    256: '#F2C24F',
    512: '#EFB73A',
    1024: '#ECAC26',
    2048: '#E9A10E',
  };
  return map[value] ?? '#E0980B';
}
