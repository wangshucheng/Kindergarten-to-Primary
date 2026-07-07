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

      {/* 算术数独：cage 虚线区域 + 区域和角标 */}
      {cageRects.map((rect) => (
        <div
          key={`cage-${rect.id}`}
          className="absolute pointer-events-none rounded-2xl"
          style={{
            left: rect.left + 3,
            top: rect.top + 3,
            width: rect.width - 6,
            height: rect.height - 6,
            border: '2px dashed #FFB3C6',
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
