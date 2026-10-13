import React from 'react';
import {
  Cpu,
  Layers,
  Database,
  ShieldCheck,
  Users,
  CheckCircle2,
  Lock,
  Eye,
  Bot,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileCheck,
} from 'lucide-react';

export const AboutArchitecturePage: React.FC = () => {
  const bdatLayers = [
    {
      layer: 'Business',
      icon: Users,
      color: 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300',
      description:
        'Lead-to-deal enterprise sales acceleration, 100% consent preservation, frequency caps, and human oversight for high-value contracts.',
    },
    {
      layer: 'Data',
      icon: Database,
      color: 'border-cyan-500/50 bg-cyan-950/20 text-cyan-300',
      description:
        'Leads CRM records, outbound/inbound message histories, permanent suppression list, state-diff audit trail, and simulated time machine clock.',
    },
    {
      layer: 'Application',
      icon: Layers,
      color: 'border-indigo-500/50 bg-indigo-950/20 text-indigo-300',
      description:
        'Autonomous Supervisor coordinating 5 specialized agents (Researcher, Scorer, Writer, Reply Reader, Consent Guardian) across 3 confidence lanes.',
    },
    {
      layer: 'Technology',
      icon: Cpu,
      color: 'border-amber-500/50 bg-amber-950/20 text-amber-300',
      description:
        'TypeScript/React, Tailwind CSS, Vite, Express, and Google GenAI SDK (gemini-3.8-flash) with structured JSON schemas and deterministic fallbacks.',
    },
  ];

  const stakeholders = [
    {
      role: 'Sales Reps',
      wants: 'Less manual administrative burden, pre-qualified hot leads, fast research.',
      how: 'Automated ICP enrichment & personalized drafting; one-click overrides on any AI decision.',
    },
    {
      role: 'Sales Manager',
      wants: 'Complete pipeline velocity visibility, consistent qualification standards.',
      how: 'Ranked leaderboard, stage funnel, real-time KPI metrics, and time-saved auditing.',
    },
    {
      role: 'Marketing Ops',
      wants: 'On-brand messaging, strict ICP targeting, zero rogue sales outreach.',
      how: 'Configurable ICP parameters, strict role-based tone templates, mandatory opt-out hooks.',
    },
    {
      role: 'Compliance & Legal',
      wants: 'Ironclad consent adherence, spam law compliance, auditable proof of opt-outs.',
      how: 'Permanent suppression list, zero-tolerance Consent Guardian, immutable audit log.',
    },
    {
      role: 'IT & Security',
      wants: 'Safe execution, zero hallucinated data leaks, simulated mail transport.',
      how: 'All outbound traffic simulated, API keys isolated on backend server, zero real email delivery.',
    },
    {
      role: 'Prospects',
      wants: 'Relevant, low-pressure communication with effortless one-click STOP.',
      how: 'Hyper-personalized research-backed hooks, no fake urgency, instant permanent unsubscribe.',
    },
  ];

  const demoSteps = [
    { step: 1, text: 'Run Pipeline on New Leads: Ingests 40 leads; duplicates, invalid emails & suppressed records blocked.' },
    { step: 2, text: 'Explainable ICP Scores: Open Elena Rostova or Marcus Brody to inspect waterfall score factors (+/-).' },
    { step: 3, text: 'Simulate Send: Top Green leads trigger personalized emails with mandatory STOP footers.' },
    { step: 4, text: 'Reply "Not Now (January)": Reply Reader sets status to not_now and creates follow-up for Jan 2027.' },
    { step: 5, text: 'Advance Clock (+3 Days): Time Machine dispatches due follow-up touches automatically.' },
    { step: 6, text: 'Reply "Please unsubscribe": Consent Guardian permanently suppresses email and cancels touches.' },
    { step: 7, text: 'Reply with Referral: "Talk to Priya at priya@company.com" autonomously spawns new prospective lead.' },
    { step: 8, text: 'Hostile/Pricing Reply: Red Lane triggers AI Executive Briefing in Human Review Queue.' },
    { step: 9, text: 'Signal Radar: Inject "raised Series B" on a lead to watch score jump from 65 to 83 (#14 to #3).' },
    { step: 10, text: 'Metrics & 15-Case Benchmark: Review 100% opt-out recall and >=85% reply classification accuracy.' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white tracking-tight">
            TrustPipeline Architecture & Responsible AI Constitution
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Designed for enterprise reliability, compliance by design, and human-in-the-loop governance.
        </p>
      </div>

      {/* BDAT Architecture Layers */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
          <Layers className="w-4 h-4 mr-2 text-indigo-400" />
          BDAT Enterprise Architecture Framework
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {bdatLayers.map((bdat, i) => {
            const Icon = bdat.icon;
            return (
              <div key={i} className={`p-4 rounded-xl border ${bdat.color} space-y-2`}>
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span className="font-bold text-sm">{bdat.layer} Layer</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{bdat.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-Agent Architecture Diagram */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
          <Bot className="w-4 h-4 mr-2 text-cyan-400" />
          Multi-Agent System Topology
        </h3>

        <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 space-y-6">
          {/* Central Supervisor */}
          <div className="max-w-md mx-auto p-4 rounded-xl bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-700/80 text-center shadow-lg">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
              Autonomous Orchestrator
            </span>
            <h4 className="text-base font-extrabold text-white">Supervisor Agent</h4>
            <p className="text-xs text-slate-300 mt-1">
              Enforces state machines, coordinates agent handoffs, evaluates confidence thresholds, and routes decisions to Green / Yellow / Red lanes.
            </p>
          </div>

          {/* 5 Specialized Agents Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                1. Researcher Agent
              </span>
              <h5 className="font-bold text-white text-xs">Signal Enrichment</h5>
              <p className="text-[11px] text-slate-400">
                Extracts pain points, buying signals, and recommended angles without inventing facts.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                2. Scorer Agent
              </span>
              <h5 className="font-bold text-white text-xs">Explainable ICP Fit</h5>
              <p className="text-[11px] text-slate-400">
                Evaluates against target parameters from Base 50 with itemized +/- factor points.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                3. Writer Agent
              </span>
              <h5 className="font-bold text-white text-xs">Empathetic Outreach</h5>
              <p className="text-[11px] text-slate-400">
                Crafts concise role-tailored emails with mandatory &ldquo;Reply STOP&rdquo; consent hook.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                4. Reply Reader Agent
              </span>
              <h5 className="font-bold text-white text-xs">Intent & Risk Triage</h5>
              <p className="text-[11px] text-slate-400">
                Classifies prospect inbounds, normalizes dates, extracts entities, and flags sensitive terms.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-rose-800/80 space-y-1.5">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                5. Consent Guardian
              </span>
              <h5 className="font-bold text-white text-xs">Deterministic Shield</h5>
              <p className="text-[11px] text-slate-400">
                5-rule deterministic firewall: email validity, suppression list, deduplication, and cadence caps.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stakeholder Value Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
          <Users className="w-4 h-4 mr-2 text-emerald-400" />
          Stakeholder Value Alignment
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Stakeholder</th>
                <th className="py-2.5 px-3">Core Need / What They Want</th>
                <th className="py-2.5 px-3">How TrustPipeline Delivers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stakeholders.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-bold text-white">{s.role}</td>
                  <td className="py-2.5 px-3 text-slate-300">{s.wants}</td>
                  <td className="py-2.5 px-3 text-slate-300">{s.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-Minute Hackathon Demo Script Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2 text-cyan-400" />
          Two-Minute Live Hackathon Demo Walkthrough
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {demoSteps.map((ds) => (
            <div
              key={ds.step}
              className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start space-x-3 text-xs"
            >
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono shrink-0">
                {ds.step}
              </span>
              <p className="text-slate-300 mt-0.5">{ds.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Responsible AI Ethical Principles */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-800/60 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center">
          <ShieldCheck className="w-4 h-4 mr-1.5" />
          The TrustPipeline Responsible AI Charter
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs text-slate-300">
          <div>
            <strong className="text-white block mb-0.5">1. Consent First</strong>
            Opt-outs are honored immediately and permanently without retention friction.
          </div>
          <div>
            <strong className="text-white block mb-0.5">2. Explainable Logic</strong>
            Scores and routing decisions are backed by visible itemized reasoning.
          </div>
          <div>
            <strong className="text-white block mb-0.5">3. Confidence Lanes</strong>
            High-risk or sensitive conversations are flagged for human executive care.
          </div>
          <div>
            <strong className="text-white block mb-0.5">4. Simulated Transport</strong>
            No unconsented emails sent; mock data prevents real-world spam contamination.
          </div>
          <div>
            <strong className="text-white block mb-0.5">5. Zero Hallucination</strong>
            Agent writers are prohibited from fabricating quotes, metrics, or testimonials.
          </div>
        </div>
      </div>
    </div>
  );
};
