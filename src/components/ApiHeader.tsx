import React from 'react';
import { Activity, Zap, Terminal, LayoutDashboard, Sparkles, AlertCircle } from 'lucide-react';

interface ApiHeaderProps {
  healthStatus: 'loading' | 'ok' | 'error';
  latencyMs: number | null;
  activeView: 'dashboard' | 'console' | 'split';
  onChangeView: (v: 'dashboard' | 'console' | 'split') => void;
  onOpenDocs: () => void;
  onRecheckHealth: () => void;
}

export const ApiHeader: React.FC<ApiHeaderProps> = ({
  healthStatus,
  latencyMs,
  activeView,
  onChangeView,
  onOpenDocs,
  onRecheckHealth,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Smart Campus Energy Optimizer
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                BUP CSE FEST 2026
              </span>
            </div>
            <p className="text-xs text-slate-500">
              LLM-Assisted Operator Directive Interpretation & 24h Mathematical Scheduling API
            </p>
          </div>
        </div>

        {/* Center/Right controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Mode View Switcher: Interactive Console vs Visual Dashboard */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => onChangeView('dashboard')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all ${
                activeView === 'dashboard'
                  ? 'bg-white font-bold text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Visual Dashboard</span>
            </button>
            <button
              onClick={() => onChangeView('console')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all ${
                activeView === 'console'
                  ? 'bg-white font-bold text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-blue-600" />
              <span>API Console</span>
            </button>
            <button
              onClick={() => onChangeView('split')}
              className={`hidden md:inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all ${
                activeView === 'split'
                  ? 'bg-white font-bold text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Dual View</span>
            </button>
          </div>

          {/* Health Endpoint Badge */}
          <button
            onClick={onRecheckHealth}
            title="Click to ping /health"
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 font-mono transition-colors"
          >
            <span className="font-semibold text-slate-500">GET /health</span>
            {healthStatus === 'ok' ? (
              <span className="flex items-center text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                200 OK {latencyMs !== null ? `(${latencyMs}ms)` : ''}
              </span>
            ) : healthStatus === 'loading' ? (
              <span className="text-slate-400">Pinging...</span>
            ) : (
              <span className="flex items-center text-rose-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Offline
              </span>
            )}
          </button>

          {/* Documentation & Specs Button */}
          <button
            onClick={onOpenDocs}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            <span>API Docs</span>
          </button>
        </div>
      </div>
    </header>
  );
};
