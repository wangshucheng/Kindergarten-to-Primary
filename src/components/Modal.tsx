import type { ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  title: string;
  emoji?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
}

/**
 * Modal —— 居中可爱弹窗，用于结算、提示。
 * 半透明遮罩 + 奶油白卡片 + 大圆角，点击遮罩外不自动关闭（避免误触）。
 */
export function Modal({ title, emoji, children, actions, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm bg-cream rounded-4xl shadow-soft p-6 text-center animate-pop"
        style={{ touchAction: 'manipulation' }}
      >
        {emoji != null && <div className="text-6xl mb-2 animate-floaty">{emoji}</div>}
        <h2 className="text-2xl font-bold text-ink mb-2">{title}</h2>
        {children != null && <div className="text-inkSoft mb-4">{children}</div>}
        <div className="flex flex-col gap-2">
          {actions ?? (
            <Button variant="mint" onClick={() => onClose?.()}>
              好的
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
