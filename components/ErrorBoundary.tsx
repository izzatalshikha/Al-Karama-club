import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[350px] p-6 sm:p-10 flex items-center justify-center bg-slate-50 font-['IBM_Plex_Sans_Arabic']" dir="rtl">
          <div className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-8 border-2 border-red-200 shadow-xl space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shadow-inner">
              <ShieldAlert size={34} />
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-blue-950 mb-1">
                {this.props.fallbackTitle || 'حدث تنبيه أثناء عرض هذه الصفحة'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-bold leading-relaxed">
                تم احتواء المشكلة بنجاح لمنع ظهور الشاشة البيضاء. يمكنك إعادة المحاولة أو تحديث الصفحة لمواصلة العمل بسلاسة.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-right text-[11px] font-mono text-slate-700 overflow-x-auto max-h-32">
                <span className="font-bold text-red-600 block mb-1">تفاصيل التنبيه:</span>
                <code>{this.state.error.message || String(this.state.error)}</code>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <RefreshCw size={16} />
                <span>إعادة المحاولة</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <RefreshCw size={16} />
                <span>تحديث التطبيق</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
