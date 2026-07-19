import { useCallback, useRef, useState } from 'react';

export interface DragHandlers {
  bind: {
    onPointerDown: (e: React.PointerEvent) => void;
  };
  state: {
    dx: number;
    dy: number;
    dragging: boolean;
  };
}

/**
 * useDrag —— 轻量 Pointer 拖拽 hook。
 * 默认所有玩法以 tap 为主；需要真实拖拽的砖块/滑块可选择性启用。
 * onEnd 回调提供相对起点的位移 (dx, dy)，由调用方判定方向或点击。
 */
export function useDrag(opts: {
  onStart?: () => void;
  onMove?: (dx: number, dy: number) => void;
  onEnd?: (dx: number, dy: number) => void;
} = {}): DragHandlers {
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const start = useRef<{ x: number; y: number } | null>(null);
  const [state, setState] = useState<{ dx: number; dy: number; dragging: boolean }>({
    dx: 0,
    dy: 0,
    dragging: false,
  });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    setState({ dx: 0, dy: 0, dragging: true });
    optsRef.current.onStart?.();

    const move = (ev: PointerEvent) => {
      if (!start.current) return;
      const dx = ev.clientX - start.current.x;
      const dy = ev.clientY - start.current.y;
      setState({ dx, dy, dragging: true });
      optsRef.current.onMove?.(dx, dy);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!start.current) return;
      const dx = ev.clientX - start.current.x;
      const dy = ev.clientY - start.current.y;
      start.current = null;
      setState({ dx, dy, dragging: false });
      optsRef.current.onEnd?.(dx, dy);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, []);

  return { bind: { onPointerDown }, state };
}
