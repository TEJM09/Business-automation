# TrustPipeline: "The sales autopilot that earns trust."

**Hackathon:** SYNESIS 26, Business Automations  
**Problem Statement 1:** Sales Pipeline Autopilot  
**Core Motto:** "From Lead Discovery to Deal Progression • Automate the Work, Not the Relationship"

---

## 🌟 What is TrustPipeline?

Traditional sales automation relies on rigid, tone-deaf bulk email blasts that alienate prospects, miss buying signals, and cannot interpret replies or respect user consent.

**TrustPipeline** is a responsible, multi-agent sales autopilot built on Google's Gemini models. It discovers ICP leads, scores qualification with explainable factor breakdowns, drafts empathetic role-tailored outreach with mandatory opt-out hooks, and classifies replies across three confidence lanes:
- 🟢 **Green Lane (Autonomous):** High-confidence (≥ 0.85), non-sensitive actions executed automatically.
- 🟡 **Yellow Lane (Approval):** Moderate confidence (0.60–0.85) queued for one-click human approval or edit.
- 🔴 **Red Lane (Human Takeover):** Hostile replies, pricing negotiations, legal concerns, or high-value accounts escalated with an AI Executive Briefing.

---

## 🛡️ Consent Guardian & Safety Architecture

Every single outbound interaction passes through a deterministic **Consent Guardian**:
1. **Valid Email Verification:** Blocks malformed addresses and missing fields.
2. **Permanent Suppression List:** 100% opt-out recall. Immediate and irreversible suppression when "STOP" or "unsubscribe" is requested.
3. **Restricted Status Guard:** Prohibits outreach to unsubscribed or escalated leads.
4. **Duplicate Deduplication:** Fuzzy-matches names and exact emails across company records to guarantee zero duplicate touches.
5. **Cadence Frequency Cap:** Max 1 outbound per lead per 3 simulated days; hard limit of 3 touches before mandatory human escalation.
6. **Simulated Sending:** Outbound emails are strictly simulated (`status = sent_simulated`); no live spam is ever delivered.

---

## 🏗️ BDAT Architecture

| Layer | Implementation in TrustPipeline |
|---|---|
| **Business** | Lead-to-deal sales pipeline acceleration, CAN-SPAM/GDPR compliance by design, human escalation protocol for high-value contracts. |
| **Data** | 40 mock leads dataset, messages timeline, suppression list, review queue, and immutable audit log. |
| **Application** | Supervisor + 5 Agents (Researcher, Scorer, Writer, Reply Reader, Consent Guardian), 3 Autonomy Lanes, Time Machine scheduler. |
| **Technology** | Full-Stack TypeScript/React, Tailwind CSS, Vite, Express, and `@google/genai` (Gemini 3.8 Flash) with structured JSON schemas and deterministic fallbacks. |

---

## 👥 Stakeholder Alignment

| Stakeholder | What They Want | How TrustPipeline Delivers |
|---|---|---|
| **Sales Reps** | Less manual admin work, hotter leads | Automated research & draft generation; one-click overrides on any AI decision. |
| **Sales Manager** | Visibility, velocity, and quality control | Ranked leaderboard, stage funnel, real-time KPI metrics, time-saved tracking. |
| **Marketing Ops** | On-brand, targeted messaging | Configurable ICP parameters, strict role-based tone guidelines, mandatory STOP footers. |
| **Compliance & Legal** | Ironclad consent and audit proof | Permanent suppression list, zero-tolerance Guardian, immutable exportable audit log. |
| **IT & Security** | Safe, isolated architecture | Keys stored in server environment, simulated email transport, zero scraping. |
| **Prospects** | Relevant outreach and easy opt-out | Personalized hooks, zero fake urgency, instantaneous opt-out honoring. |

---

## 🚀 The 7 Dashboard Views

1. **Overview & Metrics:** Executive KPI cards (time saved, opt-outs honored, duplicates blocked, positive reply rate), Autonomy Lane distribution, Funnel chart, and the 15-case Reply Intelligence evaluation benchmark runner.
2. **Lead Pipeline:** Ranked leaderboard sorted by ICP score with multi-attribute filtering, "Run Pipeline" animated execution, and a slide-out Lead Detail Drawer featuring Researcher intelligence and Scorer waterfall factor breakdowns (+/- points).
3. **Outreach & Reply Lab:** Select any lead to inspect the Writer Agent draft, verify the Consent Guardian firewall decision, test simulated sending, and simulate prospect replies with real-time before/after CRM state diffing.
4. **Human Review Queue:** Dedicated tabs for Yellow approval items and Red human takeovers with AI Executive Briefings (who, what they said, why escalated, suggested next step, and tone advice).
5. **Signal Radar & Time Machine:** Inject real-world buying signals (e.g., "raised Series B", "hiring 5 sales reps") to observe instantaneous re-ranking, and advance the simulated date (+1, +3, +7 days) to process scheduled follow-ups.
6. **Audit Trail:** Immutable ledger of every agent action with color-coded decision badges and one-click CSV export.
7. **Architecture & Demo Script:** Interactive BDAT overview, multi-agent system topology, stakeholder matrix, responsible AI charter, and a two-minute hackathon presentation checklist.

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional, app includes safe fallback demo mode)
cp .env.example .env
# Add GEMINI_API_KEY in .env

# 3. Start development server
npm run dev
# Server runs on http://localhost:3000
```
