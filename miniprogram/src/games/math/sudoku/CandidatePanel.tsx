/**
 * CandidatePanel —— 候选数字/字母面板。
 * 渲染 1..size 按钮；字母模式显示 A..；所有数字均可选择，不置灰。
 */
import { View, Text, Image, Input, ScrollView, Picker } from '@tarojs/components';
import type { SudokuSize } from './types';
import { numberToLetter } from './engine';

interface CandidatePanelProps {
  size: SudokuSize;
  letterMode?: boolean;
  onPick: (v: number) => void;
}

export function CandidatePanel({ size, letterMode, onPick }: CandidatePanelProps) {
  const items = Array.from({ length: size }, (_, i) => i + 1);

  return (
    <View
      className="flex flex-wrap justify-center gap-2 mt-3"
      style={{ maxWidth: size === 9 ? 460 : 360 }}
    >
      {items.map((v) => {
        const label = letterMode ? numberToLetter(v, size) : String(v);
        return (
          <View
            key={v}
            onClick={() => onPick(v)}
            className={[
              'w-12 h-12 rounded-2xl font-extrabold text-xl shadow-soft transition-all',
              'bg-white text-ink active:scale-95 hover:bg-mint/30 cursor-pointer',
            ].join(' ')}
          >
            {label}
          </View>
        );
      })}
    </View>
  );
}

export default CandidatePanel;
