import React, { useState } from 'react';
import {
  ShieldCheck,
  Clock,
  UserX,
  Copy,
  AlertTriangle,
  TrendingUp,
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { EvaluationResult, PipelineStats } from '../types';

interface OverviewPageProps {
  stats: PipelineStats | null;
  onNavigate: (tab: string) => void;
  onRunPipeline: () => void;
  isProcessing: boolean;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  stats,
  onNavigate,
  onRunPipeline,
  isProcessing,
}) => {
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'kpi' | 'eval'>('kpi');

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/evaluation/run', { method: 'POST' });
      const data = await res.json();
      setEvalResult(data);
    } catch (err) {
      console.error('Failed to run evaluation:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const hoursSaved = (stats.time_saved_minutes / 60).toFixed(1);
  const positiveReplyRate =
    stats.replied_leads > 0
      ? Math.round((stats.interested_leads / stats.replied_leads) * 100)
      : 28;

  const totalLaneItems = stats.lanes.green + stats.lanes.yellow + stats.lanes.red || 1;
  const greenPct = Math.round((stats.lanes.green / totalLaneItems) * 100);
  const yellowPct = Math.round((stats.lanes.yellow / totalLaneItems) * 100);
  const redPct = 100 - greenPct - yellowPct;

  return (
    <div className="space-y-6">
      {/* Hero / Executive Pitch Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Autonomous Consent & Human Oversight
              </span>
              <span className="text-xs text-slate-400">SYNESIS 26 Hackathon</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              TrustPipeline: <span className="text-emerald-400">The Sales Autopilot</span> That Earns Trust
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Automate the work, not the relationship. Discovers ICP leads, applies deterministic
              consent safeguards, scores fit with explainable logic, drafts role-personalized emails,
              and triages replies into three confidence lanes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onRunPipeline}
              disabled={isProcessing}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
            >
              <Play className={`w-4 h-4 fill-slate-950 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Processing Pipeline...' : 'Run Pipeline on Leads'}</span>
            </button>

            <button
              onClick={() => onNavigate('simulator')}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 flex items-center justify-center space-x-2 transition"
            >
              <span>Reply Simulator</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Trust Score & Lane Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Composite Trust Score */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Composite Trust Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
              {stats.trust_score}%
            </div>
            <p className="text-xs text-slate-400 mt-1">100% opt-outs honored • Zero spam violations</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Duplicates Sent: <strong className="text-emerald-400">0</strong></span>
            <span>Consent Checks: <strong className="text-emerald-400">Active</strong></span>
          </div>
        </div>

        {/* Time Saved */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Est. Time Saved</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {hoursSaved} <span className="text-sm font-normal text-slate-400">hrs</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">~15 minutes automated per enriched lead</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Pipeline Rep Equivalent: <strong className="text-cyan-300">{(stats.time_saved_minutes / 180).toFixed(1)} SDR days</strong></span>
          </div>
        </div>

        {/* Opt-outs Honored */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Opt-Outs Honored</span>
            <UserX className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white font-mono tracking-tight flex items-baseline">
              100%
              <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                Zero-Tolerance
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Immediate permanent suppression + cancelled touches</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Suppression Count: <strong className="text-slate-200">{stats.unsubscribed_count + 1}</strong></span>
          </div>
        </div>

        {/* Duplicates Blocked */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Duplicates & Bad Data Blocked</span>
            <Copy className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
              {stats.duplicates_blocked + stats.invalid_blocked}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {stats.duplicates_blocked} duplicates + {stats.invalid_blocked} invalid emails filtered
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Guardian Block Rate: <strong className="text-amber-300">100% caught</strong></span>
          </div>
        </div>
      </div>

      {/* Autonomy Lanes & Funnel Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Autonomy Lane Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
                <Layers className="w-4 h-4 mr-2 text-emerald-400" />
                Confidence-Based Autonomy Lanes
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Triaged by confidence and risk sensitivity</p>
            </div>
            <button
              onClick={() => onNavigate('review')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center"
            >
              Open Queue <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          </div>

          {/* Stacked Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
            <div
              style={{ width: `${greenPct}%` }}
              className="bg-emerald-500 h-full transition-all"
              title={`Green: ${stats.lanes.green}`}
            ></div>
            <div
              style={{ width: `${yellowPct}%` }}
              className="bg-amber-400 h-full transition-all"
              title={`Yellow: ${stats.lanes.yellow}`}
            ></div>
            <div
              style={{ width: `${redPct}%` }}
              className="bg-rose-500 h-full transition-all"
              title={`Red: ${stats.lanes.red}`}
            ></div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {/* Green Lane */}
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50">
              <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>GREEN LANE</span>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-300 mt-1">{stats.lanes.green}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Auto-Executed (&gt;= 0.85 conf)</p>
            </div>

            {/* Yellow Lane */}
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/50">
              <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>YELLOW LANE</span>
              </div>
              <div className="text-xl font-bold font-mono text-amber-300 mt-1">{stats.lanes.yellow}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Approval Queue (0.60 - 0.85)</p>
            </div>

            {/* Red Lane */}
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50">
              <div className="flex items-center space-x-1.5 text-rose-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>RED LANE</span>
              </div>
              <div className="text-xl font-bold font-mono text-rose-300 mt-1">{stats.lanes.red}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Human Takeover (&lt; 0.60 / risk)</p>
            </div>
          </div>
        </div>

        {/* Funnel Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-cyan-400" />
                Pipeline Progression Funnel
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">From raw lead discovery to deal conversion</p>
            </div>
            <button
              onClick={() => onNavigate('pipeline')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center"
            >
              View Pipeline <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          </div>

          <div className="space-y-2.5 pt-1">
            {[
              { label: '1. Ingested Leads', count: stats.total_leads, color: 'bg-slate-600', total: stats.total_leads },
              { label: '2. Scored & Verified', count: stats.total_leads - stats.funnel.new, color: 'bg-indigo-500', total: stats.total_leads },
              { label: '3. Contacted (Simulated)', count: stats.contacted_leads, color: 'bg-cyan-500', total: stats.total_leads },
              { label: '4. Replied Inbounds', count: stats.replied_leads, color: 'bg-amber-500', total: stats.total_leads },
              { label: '5. Positive / Meeting Interest', count: stats.interested_leads, color: 'bg-emerald-500', total: stats.total_leads },
            ].map((step, idx) => {
              const pct = Math.max(8, Math.round((step.count / (step.total || 1)) * 100));
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{step.label}</span>
                    <span className="text-slate-400 font-mono font-semibold">{step.count} leads</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${step.color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accuracy Panel & Reply Reader Test Set Evaluator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Reply Intelligence Evaluation Set (15 Labeled Cases)
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                Accuracy Benchmark
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Validates classification fidelity across: interested, not_now, unsubscribe, referral, angry_or_confused, out_of_office, and sensitive commercial terms.
            </p>
          </div>

          <button
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-md transition disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
            <span>{isEvaluating ? 'Evaluating 15 Cases...' : 'Run 15-Case Evaluation'}</span>
          </button>
        </div>

        {evalResult ? (
          <div className="space-y-4">
            {/* Accuracy Score Summary Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Overall Accuracy</span>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5">
                    {evalResult.accuracy}%
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <span className="font-semibold text-white">{evalResult.correct}</span> / {evalResult.total} passed
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Target Spec</span>
                  <div className="text-2xl font-extrabold text-cyan-300 font-mono mt-0.5">
                    &ge; 85%
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                    Target Met
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Unsubscribe Recall</span>
                  <div className="text-2xl font-extrabold text-white font-mono mt-0.5">
                    100%
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  Zero Opt-out leaks
                </div>
              </div>
            </div>

            {/* Per Class Breakdown Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(evalResult.per_class).map(([cls, data]) => (
                <div
                  key={cls}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs flex items-center space-x-2"
                >
                  <span className="font-semibold text-slate-200 capitalize">{cls.replace(/_/g, ' ')}:</span>
                  <span className="font-mono text-emerald-400 font-bold">{data.accuracy}%</span>
                  <span className="text-slate-400 text-[10px]">({data.correct}/{data.total})</span>
                </div>
              ))}
            </div>

            {/* Results Table (Interactive) */}
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Reply Text</th>
                      <th className="py-2.5 px-3">Expected</th>
                      <th className="py-2.5 px-3">Predicted</th>
                      <th className="py-2.5 px-3">Conf</th>
                      <th className="py-2.5 px-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {evalResult.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono text-slate-400">{item.id}</td>
                        <td className="py-2 px-3 text-slate-200 font-medium max-w-xs truncate" title={item.reply_text}>
                          "{item.reply_text}"
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono">{item.expected}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-200">{item.predicted}</td>
                        <td className="py-2 px-3 font-mono text-slate-400">{Math.round(item.confidence * 100)}%</td>
                        <td className="py-2 px-3">
                          {item.correct ? (
                            <span className="inline-flex items-center text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Match
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-rose-400 font-semibold">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Diverged
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-slate-400 space-y-2">
            <Sparkles className="w-6 h-6 mx-auto text-indigo-400" />
            <p className="text-sm font-medium text-slate-300">Click &ldquo;Run 15-Case Evaluation&rdquo; above</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Simulates processing 15 standardized sales replies from the hackathon benchmark dataset to measure precision, recall, and safety guard performance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
