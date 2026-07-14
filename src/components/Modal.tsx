import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  title: string;
  emoji?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
}

/**
 * Modal —— 居中弹窗，用于结算、提示。
 * 高级化：柔和暗角遮罩 + 背景模糊淡入，卡片弹性缩放入场，圆角加大、分层阴影。
 * 点击遮罩外不自动关闭（避免低龄误触）；打开时锁定 body 滚动。
 */
export function Modal({ title, emoji, children, actions, onClose }: ModalProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 animate-fadeIn"
      style={{
        background:
          'radial-gradient(120% 120% at 50% 20%, rgba(40,30,22,0.28), rgba(40,30,22,0.42))',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-5xl shadow-float p-7 text-center animate-scaleIn glass-strong"
        style={{ touchAction: 'manipulation' }}
      >
        {emoji != null && (
          <div className="text-6xl mb-3 inline-block animate-floaty">{emoji}</div>
        )}
        <h2 className="text-2xl font-extrabold text-ink mb-2 tracking-tightish">{title}</h2>
        {children != null && <div className="text-inkSoft mb-5 leading-relaxed">{children}</div>}
        <div className="flex flex-col gap-2.5">
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
