import React, { useState } from 'react';
import {
  Search,
  Filter,
  Play,
  User,
  Building,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
  Edit3,
  Check,
  MessageSquare,
  Calendar,
  Send,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react';
import { FollowUp, Lead, Message, ReplyRecord } from '../types';

interface PipelinePageProps {
  leads: Lead[];
  onRunPipeline: () => void;
  isProcessing: boolean;
  onSelectLeadForOutreach: (leadId: string) => void;
  onRefreshLeads: () => void;
}

export const PipelinePage: React.FC<PipelinePageProps> = ({
  leads,
  onRunPipeline,
  isProcessing,
  onSelectLeadForOutreach,
  onRefreshLeads,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLane, setSelectedLane] = useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [minScore, setMinScore] = useState<number>(0);

  // Lead Drawer
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<{
    lead: Lead;
    messages: Message[];
    replies: ReplyRecord[];
    follow_ups: FollowUp[];
  } | null>(null);
  const [loadingDrawer, setLoadingDrawer] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        lead.name.toLowerCase().includes(q) ||
        lead.company.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.role.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (selectedStatus !== 'all' && lead.status !== selectedStatus) return false;
    if (selectedLane !== 'all' && lead.lane !== selectedLane) return false;
    if (selectedIndustry !== 'all' && lead.industry.toLowerCase() !== selectedIndustry.toLowerCase())
      return false;
    if (lead.score < minScore) return false;
    return true;
  });

  const openDrawer = async (leadId: string) => {
    setActiveLeadId(leadId);
    setLoadingDrawer(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setDrawerData(data);
        setEditedNotes(data.lead.owner_notes || '');
      }
    } catch (err) {
      console.error('Failed to load lead details:', err);
    } finally {
      setLoadingDrawer(false);
    }
  };

  const closeDrawer = () => {
    setActiveLeadId(null);
    setDrawerData(null);
  };

  const handleSaveNotes = async () => {
    if (!activeLeadId) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/leads/${activeLeadId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editedNotes }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (drawerData) {
          setDrawerData({ ...drawerData, lead: updated });
        }
        onRefreshLeads();
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'interested':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Interested</span>;
      case 'contacted':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Contacted</span>;
      case 'scored':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Scored</span>;
      case 'not_now':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Not Now</span>;
      case 'referred':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">Referred</span>;
      case 'unsubscribed':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">Unsubscribed</span>;
      case 'escalated':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">Escalated</span>;
      case 'blocked_duplicate':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-700 text-slate-300 border border-slate-600">Blocked Duplicate</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400">New</span>;
    }
  };

  const getLaneBadge = (lane: string) => {
    switch (lane) {
      case 'green':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">GREEN</span>;
      case 'yellow':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700">YELLOW</span>;
      case 'red':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700">RED</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header & Execution Stepper */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Enterprise Lead Pipeline</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredLeads.length} of {leads.length} Leads
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ranked by ICP fit score with Consent Guardian safety verification and autonomous outreach triggers.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRunPipeline}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-md transition disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-slate-950 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Running Autopilot...' : 'Run Pipeline on New Leads'}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, company, email, role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Lane Filter */}
          <div>
            <select
              value={selectedLane}
              onChange={(e) => setSelectedLane(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Autonomy Lanes</option>
              <option value="green">Green Lane (Auto)</option>
              <option value="yellow">Yellow Lane (Approval)</option>
              <option value="red">Red Lane (Human)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="new">New (Unprocessed)</option>
              <option value="scored">Scored</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="not_now">Not Now</option>
              <option value="referred">Referred</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="escalated">Escalated</option>
              <option value="blocked_duplicate">Blocked Duplicate</option>
            </select>
          </div>

          {/* Industry Filter */}
          <div>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Industries</option>
              <option value="saas">SaaS</option>
              <option value="logistics">Logistics</option>
              <option value="fintech">Fintech</option>
              <option value="e-commerce">E-commerce</option>
              <option value="healthcare">Healthcare (Out of ICP)</option>
              <option value="manufacturing">Manufacturing</option>
            </select>
          </div>
        </div>

        {/* Min Score Range */}
        <div className="flex items-center space-x-3 text-xs pt-1 border-t border-slate-800/60 text-slate-400">
          <span>Min ICP Score:</span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={minScore}
            onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
            className="w-32 accent-emerald-500"
          />
          <span className="font-mono text-emerald-400 font-bold">{minScore}+</span>
          {minScore > 0 && (
            <button
              onClick={() => setMinScore(0)}
              className="text-[11px] text-slate-500 hover:text-slate-300 underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Rank / Lead</th>
                <th className="py-3 px-4">Company & Industry</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">ICP Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Autonomy Lane</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLeads.map((lead, idx) => {
                const isSelected = activeLeadId === lead.id;
                return (
                  <tr
                    key={lead.id}
                    onClick={() => openDrawer(lead.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-950/20' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Rank & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-slate-400 text-[11px] w-6">#{idx + 1}</span>
                        <div>
                          <div className="font-bold text-white flex items-center">
                            {lead.name}
                            {lead.email.includes('@') ? (
                              <span title="Valid verified contact"><ShieldCheck className="w-3 h-3 text-emerald-400 ml-1.5" /></span>
                            ) : (
                              <span title="Invalid or missing email"><ShieldAlert className="w-3 h-3 text-rose-400 ml-1.5" /></span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate max-w-xs">{lead.email || '<missing email>'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Company & Industry */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{lead.company}</div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                        <span>{lead.industry}</span>
                        <span>•</span>
                        <span>{lead.company_size} emp</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {lead.role}
                    </td>

                    {/* Score */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-mono font-bold text-sm ${
                            lead.score >= 80
                              ? 'text-emerald-400'
                              : lead.score >= 50
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {lead.score}
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              lead.score >= 80
                                ? 'bg-emerald-500'
                                : lead.score >= 50
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${lead.score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(lead.status)}
                    </td>

                    {/* Lane */}
                    <td className="py-3.5 px-4">
                      {getLaneBadge(lead.lane)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectLeadForOutreach(lead.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] flex items-center space-x-1 transition"
                        >
                          <Send className="w-3 h-3 text-emerald-400" />
                          <span>Outreach</span>
                        </button>
                        <button
                          onClick={() => openDrawer(lead.id)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Detail Drawer */}
      {activeLeadId && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono">
                {drawerData ? drawerData.lead.score : '...'}
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  {drawerData ? drawerData.lead.name : 'Loading...'}
                </h3>
                <p className="text-xs text-slate-400">
                  {drawerData ? `${drawerData.lead.role} at ${drawerData.lead.company}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={closeDrawer}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loadingDrawer || !drawerData ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              <>
                {/* Status & Lane Badges */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Status:</span>
                    {getStatusBadge(drawerData.lead.status)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Autonomy Lane:</span>
                    {getLaneBadge(drawerData.lead.lane)}
                  </div>
                </div>

                {/* Signals Tags */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                    Active Buying Signals
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {drawerData.lead.signals.map((sig, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-cyan-300 border border-slate-700"
                      >
                        ⚡ {sig}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Researcher Agent Summary */}
                {drawerData.lead.research_summary && (
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Researcher Agent Intelligence</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {drawerData.lead.research_summary.summary}
                    </p>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Likely Pain Points:
                      </span>
                      <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                        {drawerData.lead.research_summary.likely_pain_points.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 block">
                        Recommended Outreach Angle:
                      </span>
                      <p className="text-xs text-indigo-300 italic mt-0.5">
                        &ldquo;{drawerData.lead.research_summary.recommended_angle}&rdquo;
                      </p>
                    </div>
                  </div>
                )}

                {/* Scorer Agent Waterfall Breakdown */}
                {drawerData.lead.score_explanation && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center">
                        <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                        Scorer Agent Waterfall (Base 50)
                      </h4>
                      <span className="text-xs font-mono font-bold text-white">
                        Final Score: {drawerData.lead.score}/100
                      </span>
                    </div>

                    <div className="space-y-2">
                      {drawerData.lead.score_explanation.factors.map((factor, i) => {
                        const isPos = factor.points >= 0;
                        return (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-start justify-between text-xs"
                          >
                            <div className="space-y-0.5 pr-2">
                              <span className="font-semibold text-slate-200">{factor.factor}</span>
                              <p className="text-[11px] text-slate-400">{factor.reason}</p>
                            </div>
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                                isPos
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {isPos ? `+${factor.points}` : factor.points}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-400 italic">
                      {drawerData.lead.score_explanation.summary}
                    </p>
                  </div>
                )}

                {/* Message History Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center">
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                    Touchpoint History & Replies
                  </h4>
                  {drawerData.messages.length === 0 && drawerData.replies.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 rounded-lg bg-slate-950 border border-slate-800">
                      No outreach messages or replies recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {drawerData.messages.map((m) => (
                        <div key={m.id} className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-cyan-400">
                            <span className="font-semibold uppercase tracking-wider">Outbound (Simulated)</span>
                            <span className="font-mono">{m.created_at}</span>
                          </div>
                          <div className="font-bold text-white">{m.subject}</div>
                          <p className="text-slate-300 whitespace-pre-line text-[11px]">{m.body}</p>
                        </div>
                      ))}

                      {drawerData.replies.map((r) => (
                        <div key={r.id} className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-amber-400">
                            <span className="font-semibold uppercase tracking-wider">Inbound Reply • {r.classification}</span>
                            <span className="font-mono">{r.created_at}</span>
                          </div>
                          <p className="text-slate-200 italic font-mono text-[11px]">&ldquo;{r.raw_text}&rdquo;</p>
                          <div className="text-[10px] text-slate-400 pt-1 border-t border-amber-900/30">
                            Confidence: {Math.round(r.confidence * 100)}% • Lane: {r.lane.toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scheduled Follow-ups */}
                {drawerData.follow_ups.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                      Scheduled Follow-Ups
                    </h4>
                    {drawerData.follow_ups.map((fu) => (
                      <div
                        key={fu.id}
                        className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-mono text-cyan-300 font-semibold">Due: {fu.due_date}</div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{fu.reason}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          fu.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300'
                            : fu.status === 'done'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {fu.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Editable Owner Notes */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                      Sales Rep Internal Notes
                    </label>
                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold flex items-center space-x-1 transition"
                    >
                      <Check className="w-3 h-3" />
                      <span>{savingNotes ? 'Saving...' : 'Save Notes'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    placeholder="Add human sales rep observations..."
                  ></textarea>
                </div>
              </>
            )}
          </div>

          {/* Drawer Footer Actions */}
          {drawerData && (
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <button
                onClick={closeDrawer}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close Drawer
              </button>
              <button
                onClick={() => {
                  closeDrawer();
                  onSelectLeadForOutreach(drawerData.lead.id);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <Send className="w-3.5 h-3.5 fill-slate-950" />
                <span>Test in Outreach Lab</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
