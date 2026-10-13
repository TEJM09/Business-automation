import React, { useState } from 'react';
import {
  Radio,
  Clock,
  Zap,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Shield,
  Layers,
  Send,
} from 'lucide-react';
import { Lead } from '../types';

interface RadarTimeMachinePageProps {
  leads: Lead[];
  simulatedDate: string;
  onRefreshLeads: () => void;
  onRefreshStats: () => void;
}

export const RadarTimeMachinePage: React.FC<RadarTimeMachinePageProps> = ({
  leads,
  simulatedDate,
  onRefreshLeads,
  onRefreshStats,
}) => {
  // Signal Radar State
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id || '');
  const [customSignal, setCustomSignal] = useState('');
  const [isInjectingSignal, setIsInjectingSignal] = useState(false);
  const [radarResult, setRadarResult] = useState<{
    lead: Lead;
    old_score: number;
    new_score: number;
    delta: number;
    old_rank: number;
    new_rank: number;
    factors: any[];
    summary: string;
  } | null>(null);

  // Time Machine State
  const [isAdvancingTime, setIsAdvancingTime] = useState(false);
  const [timeResult, setTimeResult] = useState<{
    simulated_date: string;
    days_advanced: number;
    follow_ups_handled: Array<{ follow_up: any; action: string; reason: string }>;
  } | null>(null);

  const presetSignals = [
    'raised Series B funding ($25M)',
    'hiring 5 sales and operations reps',
    'visited enterprise pricing page 4x',
    'CEO posted publicly about automation bottlenecks',
    'switched from legacy competitor tool',
  ];

  const handleInjectSignal = async (signalText: string) => {
    if (!selectedLeadId || !signalText.trim()) return;
    setIsInjectingSignal(true);
    setRadarResult(null);
    try {
      const res = await fetch(`/api/leads/${selectedLeadId}/inject-signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal: signalText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setRadarResult(data);
        onRefreshLeads();
        onRefreshStats();
      }
    } catch (err) {
      console.error('Failed to inject signal:', err);
    } finally {
      setIsInjectingSignal(false);
    }
  };

  const handleAdvanceTime = async (days: number, reset = false) => {
    setIsAdvancingTime(true);
    setTimeResult(null);
    try {
      const res = await fetch('/api/time-machine/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, reset }),
      });
      if (res.ok) {
        const data = await res.json();
        setTimeResult(data);
        onRefreshLeads();
        onRefreshStats();
      }
    } catch (err) {
      console.error('Failed to advance time:', err);
    } finally {
      setIsAdvancingTime(false);
    }
  };

  const currentLead = leads.find((l) => l.id === selectedLeadId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Signal Radar & Time Machine</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                Dynamic Re-Scoring & Temporal Automation
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Inject real-world buying signals to observe instantaneous re-ranking, and simulate temporal passage to trigger automated cadence follow-ups.
            </p>
          </div>

          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700/80">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400">Current Date:</span>
            <span className="font-mono font-bold text-cyan-300 text-sm">{simulatedDate}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: BUYING SIGNAL RADAR */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Buying Signal Radar
              </h3>
            </div>
            <span className="text-xs text-slate-400">Autonomous Re-ranking</span>
          </div>

          {/* Lead Picker */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Choose Lead to Inject Signal:</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.company} ({l.role} • Score {l.score} • Lane {l.lane.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Preset Signal Buttons */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              Inject Predefined Buying Signal:
            </label>
            <div className="space-y-1.5">
              {presetSignals.map((sig, idx) => (
                <button
                  key={idx}
                  onClick={() => handleInjectSignal(sig)}
                  disabled={isInjectingSignal}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-xs text-slate-200 transition flex items-center justify-between group disabled:opacity-50"
                >
                  <span className="flex items-center space-x-2">
                    <span className="text-emerald-400">⚡</span>
                    <span className="group-hover:text-emerald-300">{sig}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Inject & Re-rank</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Signal Input */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              Or Custom Signal:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="e.g., Launched new EMEA division..."
                value={customSignal}
                onChange={(e) => setCustomSignal(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => {
                  handleInjectSignal(customSignal);
                  setCustomSignal('');
                }}
                disabled={isInjectingSignal || !customSignal.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-50 transition"
              >
                Inject
              </button>
            </div>
          </div>

          {/* What Changed Card */}
          {radarResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Re-Ranking Impact Verdict
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {radarResult.lead.name} at {radarResult.lead.company}
                </span>
              </div>

              {/* Score & Rank Shift Metrics */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">ICP Score Shift</span>
                  <div className="flex items-center justify-center space-x-2 font-mono font-bold text-lg mt-0.5">
                    <span className="text-slate-400">{radarResult.old_score}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{radarResult.new_score}</span>
                    <span className="text-xs text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded">
                      +{radarResult.delta} pts
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Pipeline Rank Jump</span>
                  <div className="flex items-center justify-center space-x-2 font-mono font-bold text-lg mt-0.5">
                    <span className="text-slate-400">#{radarResult.old_rank}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-cyan-300">#{radarResult.new_rank}</span>
                    <span className="text-xs text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded">
                      ↑ Jumped {Math.max(0, radarResult.old_rank - radarResult.new_rank)} spots
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 italic">
                &ldquo;{radarResult.summary}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* SECTION 2: TIME MACHINE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Autonomous Time Machine
              </h3>
            </div>
            <span className="text-xs text-slate-400">Simulate Calendar Passage</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Advance the clock to test automated cadence execution. Follow-ups scheduled for prospects are dispatched in simulated send mode, while leads who have replied, unsubscribed, or escalated are automatically guarded and cancelled.
          </p>

          {/* Time Advance Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <button
              onClick={() => handleAdvanceTime(1)}
              disabled={isAdvancingTime}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500 text-center text-xs font-bold text-white transition disabled:opacity-50"
            >
              <div className="text-cyan-400 font-mono text-base">+1 Day</div>
              <span className="text-[10px] text-slate-400 font-normal">Advance 24h</span>
            </button>

            <button
              onClick={() => handleAdvanceTime(3)}
              disabled={isAdvancingTime}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500 text-center text-xs font-bold text-white transition disabled:opacity-50"
            >
              <div className="text-cyan-400 font-mono text-base">+3 Days</div>
              <span className="text-[10px] text-slate-400 font-normal">Cooling Period</span>
            </button>

            <button
              onClick={() => handleAdvanceTime(7)}
              disabled={isAdvancingTime}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500 text-center text-xs font-bold text-white transition disabled:opacity-50"
            >
              <div className="text-cyan-400 font-mono text-base">+7 Days</div>
              <span className="text-[10px] text-slate-400 font-normal">Weekly Cadence</span>
            </button>

            <button
              onClick={() => handleAdvanceTime(0, true)}
              disabled={isAdvancingTime}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500 text-center text-xs font-bold text-slate-300 transition disabled:opacity-50"
            >
              <div className="text-amber-400 font-mono text-base">Reset</div>
              <span className="text-[10px] text-slate-400 font-normal">Base 2026-10-12</span>
            </button>
          </div>

          {/* Time Machine Execution Log */}
          {timeResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Simulated Clock Advanced
                </span>
                <span className="text-xs font-mono text-white">
                  New Date: {timeResult.simulated_date}
                </span>
              </div>

              {timeResult.follow_ups_handled.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No scheduled follow-ups were due on or before {timeResult.simulated_date}.
                </p>
              ) : (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
                    Triggered Scheduled Follow-Ups ({timeResult.follow_ups_handled.length}):
                  </span>
                  {timeResult.follow_ups_handled.map((fu, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">
                          Prospect ID: {fu.follow_up.lead_id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          fu.action === 'SENT_SIMULATED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {fu.action}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">{fu.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-300 block">Cadence Safeguards In Effect:</span>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Max 1 outbound per lead per 3 simulated days</li>
              <li>Max 3 touches total before mandatory human escalation</li>
              <li>Cancelled instantly upon unsubscribe or prospect reply</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
