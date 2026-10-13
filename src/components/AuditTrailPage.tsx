import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { AuditLogEntry } from '../types';

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedDecision, setSelectedDecision] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-log');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (selectedAgent !== 'all' && log.agent.toLowerCase() !== selectedAgent.toLowerCase()) {
      return false;
    }
    if (selectedDecision !== 'all' && log.decision.toLowerCase() !== selectedDecision.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        log.reason.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.lead_id.toLowerCase().includes(q) ||
        (log.lead_name && log.lead_name.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const exportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Lead ID', 'Lead Name', 'Agent', 'Action', 'Decision', 'Reason', 'Confidence'];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.lead_id}"`,
      `"${l.lead_name || ''}"`,
      `"${l.agent}"`,
      `"${l.action}"`,
      `"${l.decision}"`,
      `"${l.reason.replace(/"/g, '""')}"`,
      l.confidence !== undefined ? `${Math.round(l.confidence * 100)}%` : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trustpipeline_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'BLOCK':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center w-fit">
            <ShieldAlert className="w-3 h-3 mr-1" /> BLOCK
          </span>
        );
      case 'ALLOW':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center w-fit">
            <CheckCircle2 className="w-3 h-3 mr-1" /> ALLOW
          </span>
        );
      case 'AUTO_EXECUTE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center w-fit">
            <Cpu className="w-3 h-3 mr-1" /> AUTO
          </span>
        );
      case 'ESCALATE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center w-fit">
            <AlertTriangle className="w-3 h-3 mr-1" /> ESCALATE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 w-fit">
            {decision}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Compliance & Agent Audit Trail</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {filteredLogs.length} Logged Decisions
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Immutable ledger of every autonomous and human decision. Explains why emails were sent, blocked, scored, or escalated.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={exportCsv}
              disabled={filteredLogs.length === 0}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search reasons, leads, actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Agent */}
        <div>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Agents</option>
            <option value="consentguardian">ConsentGuardian</option>
            <option value="supervisor">Supervisor</option>
            <option value="researcher">Researcher</option>
            <option value="scorer">Scorer</option>
            <option value="writer">Writer</option>
            <option value="replyreader">ReplyReader</option>
            <option value="humanreviewer">HumanReviewer</option>
          </select>
        </div>

        {/* Filter Decision */}
        <div>
          <select
            value={selectedDecision}
            onChange={(e) => setSelectedDecision(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Decisions</option>
            <option value="block">BLOCK (Safeguards)</option>
            <option value="allow">ALLOW</option>
            <option value="auto_execute">AUTO_EXECUTE (Green)</option>
            <option value="escalate">ESCALATE (Red)</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Agent</th>
                <th className="py-3 px-4">Lead Context</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4">Reasoning & Plain English Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredLogs.map((entry) => {
                const isBlocked = entry.decision === 'BLOCK';
                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      isBlocked
                        ? 'bg-rose-950/20 hover:bg-rose-950/30'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </td>

                    {/* Agent */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-200">{entry.agent}</span>
                    </td>

                    {/* Lead */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">
                        {entry.lead_name || entry.lead_id}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{entry.lead_id}</span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                      {entry.action}
                    </td>

                    {/* Decision */}
                    <td className="py-3 px-4">
                      {getDecisionBadge(entry.decision)}
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4">
                      <p className={`text-xs ${isBlocked ? 'text-rose-200 font-medium' : 'text-slate-300'}`}>
                        {entry.reason}
                      </p>
                      {entry.confidence !== undefined && (
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          Confidence: {Math.round(entry.confidence * 100)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
