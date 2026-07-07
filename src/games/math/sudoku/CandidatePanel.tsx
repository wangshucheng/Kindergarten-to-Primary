/**
 * CandidatePanel —— 候选数字/字母面板。
 * 渲染 1..size 按钮；字母模式显示 A..；disabled 中的值置灰不可点
 * （即当前选中格所在行/列/宫已使用的数字）。
 */
import type { SudokuSize } from './types';
import { numberToLetter } from './engine';

interface CandidatePanelProps {
  size: SudokuSize;
  letterMode?: boolean;
  onPick: (v: number) => void;
  disabled?: Set<number>;
}

export function CandidatePanel({ size, letterMode, onPick, disabled }: CandidatePanelProps) {
  const items = Array.from({ length: size }, (_, i) => i + 1);

  return (
    <div
      className="flex flex-wrap justify-center gap-2 mt-3"
      style={{ maxWidth: size === 9 ? 460 : 360 }}
    >
      {items.map((v) => {
        const isDisabled = disabled ? disabled.has(v) : false;
        const label = letterMode ? numberToLetter(v, size) : String(v);
        return (
          <button
            key={v}
            disabled={isDisabled}
            onClick={() => onPick(v)}
            className={[
              'w-12 h-12 rounded-2xl font-extrabold text-xl shadow-soft transition-all',
              isDisabled
                ? 'bg-mint/30 text-inkSoft cursor-not-allowed'
                : 'bg-white text-ink active:scale-95 hover:bg-mint/30 cursor-pointer',
            ].join(' ')}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default CandidatePanel;
