import type { CSSProperties, ReactNode, ReactElement } from 'react';

export interface GridBoardProps {
  rows: number;
  cols: number;
  renderCell: (pos: { row: number; col: number }) => ReactNode;
  gap?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * GridBoard —— 通用网格渲染原语（薄包，不含玩法逻辑）。
 * 用 CSS Grid 布局，默认 tap 交互由 cell 自身处理。
 */
export function GridBoard({
  rows,
  cols,
  renderCell,
  gap = 2,
  className = '',
  ariaLabel,
}: GridBoardProps): ReactElement {
  const cells: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(renderCell({ row: r, col: c }));
    }
  }
  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gap: `${gap * 0.25}rem`,
  };
  return (
    <div role="grid" aria-label={ariaLabel} className={['w-full', className].join(' ')} style={gridStyle}>
      {cells}
    </div>
  );
}

export default GridBoard;
