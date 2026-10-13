import React, { useState, useEffect } from 'react';
import {
  Layers,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserCheck,
  Edit3,
  Check,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  MessageSquare,
} from 'lucide-react';
import { ReviewQueueItem } from '../types';

interface ReviewQueuePageProps {
  onRefreshStats: () => void;
}

export const ReviewQueuePage: React.FC<ReviewQueuePageProps> = ({ onRefreshStats }) => {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<'yellow' | 'red'>('yellow');
  const [loading, setLoading] = useState(false);

  // Edit modal / inline states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/queue');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleResolve = async (
    id: string,
    action: 'approve' | 'edit_approve' | 'reject' | 'take_over',
    customText?: string
  ) => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/queue/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, edited_text: customText }),
      });
      if (res.ok) {
        setEditingId(null);
        setEditedText('');
        await loadQueue();
        onRefreshStats();
      }
    } catch (err) {
      console.error('Failed to resolve queue item:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const pendingYellow = items.filter((i) => i.lane === 'yellow' && i.status === 'pending');
  const pendingRed = items.filter((i) => i.lane === 'red' && i.status === 'pending');
  const resolvedItems = items.filter((i) => i.status !== 'pending');

  const currentList = activeTab === 'yellow' ? pendingYellow : pendingRed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Human-in-the-Loop Review Queue</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {pendingYellow.length + pendingRed.length} Pending Actions
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Guarantees human oversight for borderline confidence (Yellow) and sensitive escalations (Red) before any action is committed.
            </p>
          </div>

          {/* Lane Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('yellow')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition ${
                activeTab === 'yellow'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-950"></span>
              <span>Yellow Queue (Approval)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-900/40 text-[10px]">
                {pendingYellow.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('red')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition ${
                activeTab === 'red'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span>Red Queue (Takeover)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-900/40 text-[10px]">
                {pendingRed.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex items-center justify-center p-16 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : currentList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-3">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">All Clear! No Pending Items</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {activeTab === 'yellow'
              ? 'There are no pending drafts or replies waiting for human approval in the Yellow Lane.'
              : 'There are no sensitive replies or high-value accounts requiring human takeover in the Red Lane.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((item) => (
            <div
              key={item.id}
              className={`bg-slate-900 border rounded-xl p-5 space-y-4 shadow-lg ${
                item.lane === 'yellow' ? 'border-amber-800/60' : 'border-rose-800/60'
              }`}
            >
              {/* Item Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      item.lane === 'yellow'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {item.lane === 'yellow' ? 'Y' : 'R'}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center">
                      {item.lead_name}
                      <span className="text-slate-400 font-normal text-xs ml-2">
                        ({item.role} at {item.company})
                      </span>
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Logged: {item.created_at} • Confidence: {Math.round(item.confidence * 100)}%
                    </span>
                  </div>
                </div>

                <span
                  className={`self-start sm:self-auto px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    item.lane === 'yellow'
                      ? 'bg-amber-950 text-amber-300 border border-amber-700'
                      : 'bg-rose-950 text-rose-300 border border-rose-700'
                  }`}
                >
                  {item.lane === 'yellow' ? 'Requires Approval' : 'Human Takeover Required'}
                </span>
              </div>

              {/* Original Prospect Reply / Context */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Original Prospect Message:
                </span>
                <p className="text-xs text-slate-200 font-mono italic">
                  &ldquo;{item.context_text}&rdquo;
                </p>
              </div>

              {/* AI Executive Briefing */}
              {item.briefing && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Briefing for Salesperson</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">
                        Why Escalated:
                      </span>
                      <p className="text-slate-200 mt-0.5">{item.briefing.why_escalated}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">
                        Recommended Next Step:
                      </span>
                      <p className="text-slate-200 mt-0.5">{item.briefing.suggested_next_step}</p>
                    </div>

                    <div className="md:col-span-2 pt-2 border-t border-slate-800/60">
                      <span className="text-slate-400 block text-[11px] font-semibold">
                        Suggested Tone Advice:
                      </span>
                      <p className="text-emerald-300 italic mt-0.5">&ldquo;{item.briefing.tone_advice}&rdquo;</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Inline Editor if Editing */}
              {editingId === item.id && (
                <div className="p-3.5 rounded-lg bg-slate-950 border border-emerald-500/50 space-y-2">
                  <label className="text-xs font-bold text-white block">
                    Edit Proposed Response Before Approving:
                  </label>
                  <textarea
                    rows={3}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Enter customized human response..."
                  ></textarea>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleResolve(item.id, 'edit_approve', editedText)}
                      disabled={submittingAction}
                      className="px-3 py-1.5 rounded bg-emerald-500 text-slate-950 font-bold text-xs"
                    >
                      Confirm & Send
                    </button>
                  </div>
                </div>
              )}

              {/* Decision Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
                {item.lane === 'yellow' ? (
                  <>
                    <button
                      onClick={() => handleResolve(item.id, 'reject')}
                      disabled={submittingAction}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setEditedText(item.context_text);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center space-x-1.5 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Response</span>
                    </button>

                    <button
                      onClick={() => handleResolve(item.id, 'approve')}
                      disabled={submittingAction}
                      className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Suggestion</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleResolve(item.id, 'reject')}
                      disabled={submittingAction}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      Dismiss Escalation
                    </button>

                    <button
                      onClick={() => handleResolve(item.id, 'take_over')}
                      disabled={submittingAction}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-rose-600/20 transition"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Claim & Take Over Conversation</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved Items History Expander */}
      {resolvedItems.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
            Resolved Human Review History ({resolvedItems.length} Handled)
          </h3>
          <div className="divide-y divide-slate-800 text-xs">
            {resolvedItems.slice(0, 5).map((res) => (
              <div key={res.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white">{res.lead_name}</span>
                  <span className="text-slate-400 ml-2">({res.company})</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase">
                  {res.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
