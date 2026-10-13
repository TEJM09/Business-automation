import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OverviewPage } from './components/OverviewPage';
import { PipelinePage } from './components/PipelinePage';
import { SimulatorPage } from './components/SimulatorPage';
import { ReviewQueuePage } from './components/ReviewQueuePage';
import { RadarTimeMachinePage } from './components/RadarTimeMachinePage';
import { AuditTrailPage } from './components/AuditTrailPage';
import { AboutArchitecturePage } from './components/AboutArchitecturePage';
import { Lead, PipelineStats } from './types';
import { CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [simulatedDate, setSimulatedDate] = useState<string>('2026-10-12');
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [rateLimited, setRateLimited] = useState<boolean>(false);
  const [retryInSeconds, setRetryInSeconds] = useState<number>(0);

  // Cross-page navigation target lead
  const [outreachTargetLeadId, setOutreachTargetLeadId] = useState<string | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setSimulatedDate(data.simulated_date);
        setDemoMode(data.demo_mode);
        setRateLimited(Boolean(data.rate_limited));
        setRetryInSeconds(data.retry_in_seconds || 0);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLeads();
    fetchStats();
    // Poll status periodically to update rate limit timer
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRunPipeline = async () => {
    setIsProcessing(true);
    showToast('Executing multi-agent pipeline on incoming leads...', 'info');
    try {
      const res = await fetch('/api/leads/run-pipeline', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        await fetchLeads();
        await fetchStats();
        showToast(data.message, 'success');
      } else {
        showToast('Pipeline execution encountered an error.', 'warn');
      }
    } catch (err) {
      console.error('Failed to run pipeline:', err);
      showToast('Pipeline execution failed to connect to backend.', 'warn');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleDemoMode = async () => {
    try {
      const res = await fetch('/api/demo-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !demoMode }),
      });
      if (res.ok) {
        const data = await res.json();
        setDemoMode(data.demo_mode);
        showToast(
          data.demo_mode
            ? 'Demo Mode enabled (instant deterministic responses for live demo).'
            : 'Gemini 3.8 Flash live API enabled.',
          'info'
        );
      }
    } catch (err) {
      console.error('Failed to toggle demo mode:', err);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset database to initial seed dataset? This will clear all messages, replies and reload 40 leads.')) {
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        await fetchStatus();
        await fetchLeads();
        await fetchStats();
        showToast('Database reset to initial 40 seed leads with active safeguards.', 'success');
      }
    } catch (err) {
      console.error('Failed to reset:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectLeadForOutreach = (leadId: string) => {
    setOutreachTargetLeadId(leadId);
    setCurrentTab('simulator');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Global Navigation Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        simulatedDate={simulatedDate}
        demoMode={demoMode}
        onToggleDemoMode={handleToggleDemoMode}
        onReset={handleReset}
        stats={stats}
        isProcessing={isProcessing}
        rateLimited={rateLimited}
        retryInSeconds={retryInSeconds}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'overview' && (
          <OverviewPage
            stats={stats}
            onNavigate={(tab) => setCurrentTab(tab)}
            onRunPipeline={handleRunPipeline}
            isProcessing={isProcessing}
          />
        )}

        {currentTab === 'pipeline' && (
          <PipelinePage
            leads={leads}
            onRunPipeline={handleRunPipeline}
            isProcessing={isProcessing}
            onSelectLeadForOutreach={handleSelectLeadForOutreach}
            onRefreshLeads={() => {
              fetchLeads();
              fetchStats();
            }}
          />
        )}

        {currentTab === 'simulator' && (
          <SimulatorPage
            leads={leads}
            preselectedLeadId={outreachTargetLeadId}
            onRefreshLeads={() => {
              fetchLeads();
              fetchStats();
            }}
            onNavigateToQueue={() => setCurrentTab('review')}
          />
        )}

        {currentTab === 'review' && (
          <ReviewQueuePage
            onRefreshStats={() => {
              fetchStats();
              fetchLeads();
            }}
          />
        )}

        {currentTab === 'radar' && (
          <RadarTimeMachinePage
            leads={leads}
            simulatedDate={simulatedDate}
            onRefreshLeads={fetchLeads}
            onRefreshStats={() => {
              fetchStats();
              fetchStatus();
            }}
          />
        )}

        {currentTab === 'audit' && <AuditTrailPage />}

        {currentTab === 'about' && <AboutArchitecturePage />}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-xs font-semibold border ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-700'
                : toast.type === 'warn'
                ? 'bg-rose-950 text-rose-200 border-rose-700'
                : 'bg-indigo-950 text-indigo-200 border-indigo-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : toast.type === 'warn' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <Info className="w-4 h-4 text-indigo-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TrustPipeline • SYNESIS 26 Hackathon • Sales Pipeline Autopilot</span>
          <span className="text-[11px] text-slate-400 font-mono">
            &ldquo;Automate the Work, Not the Relationship&rdquo;
          </span>
        </div>
      </footer>
    </div>
  );
}
