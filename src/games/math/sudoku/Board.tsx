/**
 * Board —— 数独棋盘渲染组件。
 * 用 CSS grid 渲染 size×size；预填格不可点、空格可点；选中格高亮；
 * 宫边界加粗；可选 cages 叠加虚线圆角框与区域和角标；字母模式显示字母。
 */
import type { Board as BoardType, Cage, SudokuSize } from './types';
import { BOX } from './types';
import { numberToLetter } from './engine';

interface BoardProps {
  size: SudokuSize;
  board: BoardType;
  selected: [number, number] | null;
  onCellClick: (r: number, c: number) => void;
  cages?: Cage[];
  letterMode?: boolean;
}

/** 根据尺寸自适应格子像素。 */
function cellSize(size: SudokuSize): number {
  return size === 6 ? 60 : 44;
}

/**
 * 算术数独 cages 的柔和配色（适合幼儿、彼此可区分）。
 * 至少 10 色，足以覆盖一个 9×9 算术数独的全部 cage（通常 10+ 个）。
 * 颜色偏浅、对比适中，保证彩色虚线边框旁的深色 sum 角标仍清晰可读。
 */
const CAGE_COLORS: readonly string[] = [
  '#7FD8C0', // 薄荷绿
  '#FFE08A', // 柠檬黄
  '#FFB3C6', // 桃粉
  '#8EC9FF', // 天蓝
  '#C9B6FF', // 淡紫
  '#FFC59E', // 蜜橙
  '#B5E48C', // 草绿
  '#FFA6C9', // 玫瑰红
  '#8ED6D6', // 青绿
  '#D8B4F0', // 丁香紫
  '#FFB59E', // 珊瑚橙
  '#A8E6A3', // 嫩芽绿
];

/** 按 cage id 取模映射到配色，使每个 cage 边框颜色不同。 */
function cageColor(id: number): string {
  const idx = ((id % CAGE_COLORS.length) + CAGE_COLORS.length) % CAGE_COLORS.length;
  return CAGE_COLORS[idx];
}

export function Board({ size, board, selected, onCellClick, cages, letterMode }: BoardProps) {
  const box = BOX[size];
  const CELL = cellSize(size);
  const pixel = size * CELL;

  // 计算每个 cage 的像素包围盒（最小/最大行列范围）。
  const cageRects = (cages ?? []).map((cage) => {
    let minR: number = size;
    let maxR = 0;
    let minC: number = size;
    let maxC = 0;
    for (const [r, c] of cage.cells) {
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minC = Math.min(minC, c);
      maxC = Math.max(maxC, c);
    }
    return {
      id: cage.id,
      sum: cage.sum,
      color: cageColor(cage.id),
      left: minC * CELL,
      top: minR * CELL,
      width: (maxC - minC + 1) * CELL,
      height: (maxR - minR + 1) * CELL,
    };
  });

  return (
    <div className="relative" style={{ width: pixel, height: pixel }}>
      <div
        className="grid bg-white rounded-3xl shadow-soft"
        style={{
          gridTemplateColumns: `repeat(${size}, ${CELL}px)`,
          gridTemplateRows: `repeat(${size}, ${CELL}px)`,
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isGiven = cell.given;
            const isFilled = cell.value !== null;
            const isSel = selected !== null && selected[0] === r && selected[1] === c;
            const display = isFilled
              ? letterMode
                ? numberToLetter(cell.value as number, size)
                : String(cell.value)
              : '';
            const thickRight = (c + 1) % box.cols === 0 && c !== size - 1;
            const thickBottom = (r + 1) % box.rows === 0 && r !== size - 1;

            return (
              <button
                key={`${r}-${c}`}
                disabled={isGiven}
                onClick={() => onCellClick(r, c)}
                className={[
                  'relative flex items-center justify-center text-2xl font-extrabold transition-all',
                  isGiven
                    ? 'bg-mint/40 text-ink cursor-default'
                    : isFilled
                      ? 'bg-mint text-ink cursor-pointer'
                      : 'bg-white text-ink cursor-pointer hover:bg-mint/20',
                  isSel ? 'ring-4 ring-white z-10' : '',
                ].join(' ')}
                style={{
                  borderRight: thickRight ? '3px solid #FFB3C6' : '1px solid #F0D9D9',
                  borderBottom: thickBottom ? '3px solid #FFB3C6' : '1px solid #F0D9D9',
                }}
              >
                {display}
              </button>
            );
          }),
        )}
      </div>

      {/* 算术数独：cage 虚线区域 + 区域和角标（不同 cage 用不同柔和配色） */}
      {cageRects.map((rect) => (
        <div
          key={`cage-${rect.id}`}
          className="absolute pointer-events-none rounded-2xl"
          style={{
            left: rect.left + 3,
            top: rect.top + 3,
            width: rect.width - 6,
            height: rect.height - 6,
            border: `2px dashed ${rect.color}`,
          }}
        >
          <span
            className="absolute top-0.5 left-1 font-bold text-inkSoft"
            style={{ fontSize: 12 }}
          >
            {rect.sum}
          </span>
        </div>
      ))}
    </div>
  );
}

export default Board;
