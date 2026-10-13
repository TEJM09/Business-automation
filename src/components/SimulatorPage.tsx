import React, { useState, useEffect } from 'react';
import {
  Send,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  UserCheck,
  UserX,
  Layers,
  Flame,
  Clock,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Lead } from '../types';

interface SimulatorPageProps {
  leads: Lead[];
  preselectedLeadId: string | null;
  onRefreshLeads: () => void;
  onNavigateToQueue: () => void;
}

export const SimulatorPage: React.FC<SimulatorPageProps> = ({
  leads,
  preselectedLeadId,
  onRefreshLeads,
  onNavigateToQueue,
}) => {
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [draftData, setDraftData] = useState<{
    subject: string;
    body: string;
    tone_used: string;
    personalization_hooks: string[];
    guardian_check: { allowed: boolean; decision: string; reason: string };
  } | null>(null);

  const [sendingOutbound, setSendingOutbound] = useState(false);
  const [outboundSentSuccess, setOutboundSentSuccess] = useState(false);

  // Reply simulation states
  const [replyText, setReplyText] = useState('');
  const [processingReply, setProcessingReply] = useState(false);
  const [replyResult, setReplyResult] = useState<{
    analysis: any;
    crm_diff: { before: any; after: any };
    escalation_briefing: any;
  } | null>(null);

  // Set default lead when loaded
  useEffect(() => {
    if (preselectedLeadId) {
      setSelectedLeadId(preselectedLeadId);
    } else if (leads.length > 0 && !selectedLeadId) {
      // Pick top scored lead
      const topLead = [...leads].sort((a, b) => b.score - a.score)[0];
      setSelectedLeadId(topLead.id);
    }
  }, [leads, preselectedLeadId]);

  // Load draft when lead changes
  useEffect(() => {
    if (selectedLeadId) {
      loadLeadDraft(selectedLeadId);
      setOutboundSentSuccess(false);
      setReplyResult(null);
    }
  }, [selectedLeadId]);

  const loadLeadDraft = async (leadId: string) => {
    setLoadingDraft(true);
    setDraftData(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/draft`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDraftData({
          subject: data.draft.subject,
          body: data.draft.body,
          tone_used: data.draft.tone_used,
          personalization_hooks: data.draft.personalization_hooks,
          guardian_check: data.guardian_check,
        });
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleSimulateSend = async () => {
    if (!selectedLeadId || !draftData) return;
    setSendingOutbound(true);
    try {
      const res = await fetch(`/api/leads/${selectedLeadId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: draftData.subject,
          body: draftData.body,
          tone_used: draftData.tone_used,
          personalization_hooks: draftData.personalization_hooks,
        }),
      });
      if (res.ok) {
        setOutboundSentSuccess(true);
        onRefreshLeads();
      } else {
        const err = await res.json();
        alert(`Outbound send blocked: ${err.guardian_check?.reason || err.error}`);
      }
    } catch (err) {
      console.error('Failed to send outbound:', err);
    } finally {
      setSendingOutbound(false);
    }
  };

  const handleProcessReply = async () => {
    if (!selectedLeadId || !replyText.trim()) return;
    setProcessingReply(true);
    setReplyResult(null);
    try {
      const res = await fetch(`/api/leads/${selectedLeadId}/process-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_text: replyText }),
      });
      if (res.ok) {
        const data = await res.json();
        setReplyResult(data);
        onRefreshLeads();
      }
    } catch (err) {
      console.error('Failed to process reply:', err);
    } finally {
      setProcessingReply(false);
    }
  };

  const quickReplies = [
    {
      label: 'Interested',
      icon: '🤝',
      text: 'Sounds interesting, can we talk Thursday afternoon?',
      color: 'hover:border-emerald-500/50 hover:bg-emerald-950/30',
    },
    {
      label: 'Not Now (January)',
      icon: '⏳',
      text: 'Not right now, our budget is locked. Ping me in January.',
      color: 'hover:border-amber-500/50 hover:bg-amber-950/30',
    },
    {
      label: 'Unsubscribe',
      icon: '🛑',
      text: 'Please unsubscribe me and remove me from your list.',
      color: 'hover:border-rose-500/50 hover:bg-rose-950/30',
    },
    {
      label: 'Referral',
      icon: '👤',
      text: "I'm not the right person. You should talk to Priya at priya@company.com.",
      color: 'hover:border-purple-500/50 hover:bg-purple-950/30',
    },
    {
      label: 'Angry / Hostile',
      icon: '⚠️',
      text: "Why do you keep spamming me?! I didn't opt into this and I will report this domain.",
      color: 'hover:border-rose-600/50 hover:bg-rose-950/40',
    },
    {
      label: 'Out of Office',
      icon: '✈️',
      text: 'I am out of office until the 20th with limited email access.',
      color: 'hover:border-cyan-500/50 hover:bg-cyan-950/30',
    },
  ];

  const currentLead = leads.find((l) => l.id === selectedLeadId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Outreach & Reply Simulator</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                Interactive Testing Lab
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Test Writer Agent drafting, Consent Guardian firewall, and Reply Reader intelligence with real CRM state-diff tracking.
            </p>
          </div>

          {/* Lead Picker */}
          <div className="flex items-center space-x-3">
            <label className="text-xs text-slate-400 whitespace-nowrap font-medium">Select Prospect:</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-emerald-500 min-w-[280px]"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.company} • Score {l.score} • {l.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Personalized Outreach Email & Guardian Firewall */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Outreach Email Draft (Writer Agent)
                </h3>
              </div>
              {currentLead && (
                <span className="text-xs font-mono text-slate-400">
                  Target: <strong className="text-white">{currentLead.name}</strong> ({currentLead.role})
                </span>
              )}
            </div>

            {loadingDraft ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-500 mx-auto"></div>
                <p className="text-xs">Writer Agent crafting personalized outreach...</p>
              </div>
            ) : draftData ? (
              <div className="space-y-4">
                {/* Guardian Permission Badge */}
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start space-x-2.5 ${
                    draftData.guardian_check.allowed
                      ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                  }`}
                >
                  {draftData.guardian_check.allowed ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[11px] block">
                      Consent Guardian Firewall: {draftData.guardian_check.decision}
                    </span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {draftData.guardian_check.reason}
                    </p>
                  </div>
                </div>

                {/* Email Metadata */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 w-16">Tone Used:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                      {draftData.tone_used}
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-slate-400 w-16 shrink-0">Hooks:</span>
                    <span className="text-cyan-300 font-medium">
                      {draftData.personalization_hooks.join(' • ') || 'Company background'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 w-16">Subject:</span>
                    <span className="text-white font-semibold">{draftData.subject}</span>
                  </div>
                </div>

                {/* Email Body */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-sans text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                  {draftData.body}
                </div>

                {/* Simulated Send Button */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400 italic">
                    * Sending is strictly simulated (status: sent_simulated)
                  </span>

                  <button
                    onClick={handleSimulateSend}
                    disabled={sendingOutbound || !draftData.guardian_check.allowed}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
                      outboundSentSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40'
                    }`}
                  >
                    {outboundSentSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Sent (Simulated)</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 fill-current" />
                        <span>{sendingOutbound ? 'Dispatching...' : 'Simulate Send Email'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Select a lead to generate draft.</p>
            )}
          </div>
        </div>

        {/* Right Column: Inbound Reply Intelligence & CRM Diff */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Prospect Inbound Reply Tester
                </h3>
              </div>
              <span className="text-xs text-slate-400">Reply Reader Agent</span>
            </div>

            {/* Quick Sample Buttons */}
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                Quick Sample Inbounds (Click to Test):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quickReplies.map((qr, idx) => (
                  <button
                    key={idx}
                    onClick={() => setReplyText(qr.text)}
                    className={`p-2 rounded-lg bg-slate-950 border border-slate-800 text-left text-xs transition ${qr.color}`}
                  >
                    <div className="font-semibold text-slate-200 flex items-center space-x-1">
                      <span>{qr.icon}</span>
                      <span className="truncate">{qr.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reply Textarea */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                Or Type Custom Reply Text:
              </label>
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type reply e.g., 'Sounds great, let's talk Tuesday', 'Remove me from this list', 'Talk to our VP'..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              ></textarea>
            </div>

            {/* Process Reply Button */}
            <div className="flex justify-end">
              <button
                onClick={handleProcessReply}
                disabled={processingReply || !replyText.trim()}
                className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-2 transition disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${processingReply ? 'animate-spin' : ''}`} />
                <span>{processingReply ? 'Analyzing Reply...' : 'Process Reply & Update CRM'}</span>
              </button>
            </div>

            {/* Analysis Result & CRM Diff Card */}
            {replyResult && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                {/* Classification & Confidence Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Classification Verdict:
                    </span>
                    <span className="text-base font-extrabold text-white capitalize font-mono">
                      {replyResult.analysis.classification}
                    </span>
                  </div>

                  {/* Autonomy Lane Badge */}
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Routed Autonomy Lane:
                    </span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        replyResult.analysis.assignedLane === 'green'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : replyResult.analysis.assignedLane === 'yellow'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-rose-950 text-rose-300 border border-rose-700'
                      }`}
                    >
                      {replyResult.analysis.assignedLane} Lane
                    </span>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Model Confidence:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {Math.round(replyResult.analysis.confidence * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${replyResult.analysis.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 italic">
                  &ldquo;{replyResult.analysis.reasoning}&rdquo;
                </p>

                {/* Extracted Data Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Follow-up Date:</span>
                    <span className="font-mono font-semibold text-cyan-300">
                      {replyResult.analysis.extracted.follow_up_date || 'None'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Referral Entity:</span>
                    <span className="font-semibold text-purple-300 truncate block">
                      {replyResult.analysis.extracted.referral_email || replyResult.analysis.extracted.referral_name || 'None'}
                    </span>
                  </div>
                </div>

                {/* CRM State Diff (Before vs After) */}
                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
                    CRM State Changes Enacted (Before → After):
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Lead Status:</span>
                      <div className="font-mono text-slate-300 flex items-center space-x-1.5">
                        <span className="line-through text-slate-500">{replyResult.crm_diff.before.status}</span>
                        <ArrowRight className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">{replyResult.crm_diff.after.status}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Suppression Status:</span>
                      <div className="font-mono text-slate-300 flex items-center space-x-1.5">
                        <span>{replyResult.crm_diff.before.suppressed ? 'Suppressed' : 'Active'}</span>
                        <ArrowRight className="w-3 h-3 text-emerald-400" />
                        <span className={replyResult.crm_diff.after.suppressed ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {replyResult.crm_diff.after.suppressed ? 'Permanently Suppressed' : 'Active'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Active Follow-Ups:</span>
                      <div className="font-mono text-slate-300 flex items-center space-x-1.5">
                        <span>{replyResult.crm_diff.before.follow_ups}</span>
                        <ArrowRight className="w-3 h-3 text-cyan-400" />
                        <span className="text-cyan-300 font-bold">{replyResult.crm_diff.after.follow_ups}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* If RED Lane Escalation: Show Action Link */}
                {replyResult.analysis.assignedLane === 'red' && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-rose-300 flex items-center">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Escalated to Human Review Queue
                      </span>
                      <p className="text-[11px] text-slate-300">AI prepared a dedicated salesperson briefing.</p>
                    </div>
                    <button
                      onClick={onNavigateToQueue}
                      className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
                    >
                      Open Queue
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
