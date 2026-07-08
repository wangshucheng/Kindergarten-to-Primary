import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** 自定义降级 UI，不传则使用内置儿童友好界面 */
  fallback?: ReactNode;
  /** 错误上报回调，接入外部监控（Sentry / 自定义日志） */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary —— 全局错误边界，捕获子树中任何未处理异常。
 *
 * 设计要点：
 * - 低龄友好降级 UI：大 emoji + 大字号文案 + 重新加载按钮；
 * - 支持 onError 回调接入外部错误上报（Sentry / 自建日志）；
 * - componentDidCatch 在渲染阶段之后触发，不会阻塞降级渲染；
 * - 不捕获事件处理器中的错误（由 React 18 自动处理）。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 内部日志（生产环境可替换为 Sentry.captureException）
    console.error('[ErrorBoundary] 捕获到未处理异常:', error, info.componentStack);

    // 外部上报回调
    this.props.onError?.(error, info);
  }

  private handleReload = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 bg-cream text-center"
          role="alert"
        >
          <div className="text-7xl animate-floaty">😢</div>
          <h1 className="text-2xl font-extrabold text-ink">哎呀，出了点小问题</h1>
          <p className="text-inkSoft text-base max-w-xs">
            不用着急，点一下下面的按钮就好啦！
          </p>
          {this.state.error?.message && (
            <p className="text-xs text-inkSoft/60 bg-white/60 px-3 py-1.5 rounded-2xl max-w-sm break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-2 px-8 py-4 rounded-3xl bg-mint text-ink font-extrabold text-lg shadow-press active:scale-95 transition-transform"
            style={{ touchAction: 'manipulation' }}
          >
            重新开始 🔄
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}


