import React from 'react';
import {
  ShieldCheck,
  Calendar,
  RefreshCw,
  Sparkles,
  Cpu,
  Layers,
  BarChart3,
  Users,
  Send,
  Clock,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';
import { PipelineStats } from '../types';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  simulatedDate: string;
  demoMode: boolean;
  onToggleDemoMode: () => void;
  onReset: () => void;
  stats: PipelineStats | null;
  isProcessing: boolean;
  rateLimited?: boolean;
  retryInSeconds?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  simulatedDate,
  demoMode,
  onToggleDemoMode,
  onReset,
  stats,
  isProcessing,
  rateLimited,
  retryInSeconds,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview & Metrics', icon: BarChart3 },
    { id: 'pipeline', label: 'Lead Pipeline', icon: Users },
    { id: 'simulator', label: 'Outreach & Reply Lab', icon: Send },
    { id: 'review', label: 'Human Review Queue', icon: Layers, badge: stats ? stats.lanes.yellow + stats.lanes.red : 0 },
    { id: 'radar', label: 'Signal Radar & Time Machine', icon: Radio },
    { id: 'audit', label: 'Audit Trail', icon: FileSpreadsheet },
    { id: 'about', label: 'Architecture & Demo Script', icon: Cpu },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-slate-800/60">
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center">
                  TrustPipeline
                  <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Autopilot v2.6
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">The sales autopilot that earns trust • Autonomous, explainable, consent-guarded</p>
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center space-x-3">
            {/* Simulated Date Widget */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Simulated Date:</span>
              <span className="font-mono font-semibold text-cyan-300">{simulatedDate}</span>
            </div>

            {/* Lane Autonomy Badges */}
            {stats && (
              <div className="hidden lg:flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="font-semibold">{stats.lanes.green}</span>
                  <span className="text-[10px] text-emerald-400/80">Auto</span>
                </span>
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span className="font-semibold">{stats.lanes.yellow}</span>
                  <span className="text-[10px] text-amber-400/80">Approval</span>
                </span>
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <span className="font-semibold">{stats.lanes.red}</span>
                  <span className="text-[10px] text-rose-400/80">Takeover</span>
                </span>
              </div>
            )}

            {/* Demo Mode Toggle */}
            <button
              onClick={onToggleDemoMode}
              title={
                demoMode
                  ? 'Deterministic mode active'
                  : rateLimited
                  ? `Free tier rate limit cooldown active (${retryInSeconds}s) - using deterministic fallback`
                  : 'Live Gemini 3.8 Flash active'
              }
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                demoMode
                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/70 shadow-sm'
                  : rateLimited
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700/70'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {demoMode
                  ? 'Demo Mode: ON'
                  : rateLimited
                  ? `Cooldown (${retryInSeconds}s)`
                  : 'Gemini 3.8: Live'}
              </span>
            </button>

            {/* Reset Button */}
            <button
              onClick={onReset}
              disabled={isProcessing}
              title="Reset all leads, messages, follow-ups and audit log to initial state"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset Seed</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-2.5 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
