'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, ShieldCheck, Database } from 'lucide-react';

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
    console.error('ErrorBoundary capturou uma falha não tratada:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl border border-amber-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-6 space-y-5 text-center">
            {/* Soft Icon Header */}
            <div className="w-14 h-14 rounded-2xl bg-amber-100/80 text-amber-800 flex items-center justify-center mx-auto shadow-xs border border-amber-200">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold font-serif text-slate-900 tracking-tight">
                {this.props.fallbackTitle || 'Visualização Protegida'}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ocorreu uma instabilidade na exibição, mas seus livros e dados da Bíblia e Devocional estão salvos e 100% seguros no armazenamento local.
              </p>
            </div>

            {/* Error badge */}
            {this.state.error && (
              <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-left text-[11px] font-mono text-slate-700 max-h-28 overflow-y-auto break-all">
                {this.state.error.message || 'Erro de renderização temporário'}
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl font-bold text-xs bg-amber-500 hover:bg-amber-600 active:scale-95 text-white transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Restaurar Visualização</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 transition-all border border-slate-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Voltar ao Início do ALTTO</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-center gap-1">
              <Database className="w-3 h-3 text-emerald-600" />
              <span>IndexedDB protegido • Nenhum dado foi apagado</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
