import { GoogleGenAI } from '@google/genai';
import {
  EscalationBriefing,
  ExtractedReplyData,
  LaneType,
  Lead,
  ReplyClassification,
  ResearchSummary,
  ScoreExplanation,
} from '../src/types';
import { db } from './db';
import { flowDeskICP } from './seedData';

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const MODEL_NAME = 'gemini-3.8-flash';

let rateLimitedUntil = 0;

export function getRateLimitStatus(): { isRateLimited: boolean; retryInSeconds: number } {
  const now = Date.now();
  if (now < rateLimitedUntil) {
    return { isRateLimited: true, retryInSeconds: Math.ceil((rateLimitedUntil - now) / 1000) };
  }
  return { isRateLimited: false, retryInSeconds: 0 };
}

// Helper to safely call Gemini with JSON schema and fallback
async function callGeminiJson<T>(
  systemPrompt: string,
  userPrompt: string,
  fallbackFn: () => T,
  forceDeterministic = false
): Promise<T> {
  const now = Date.now();
  if (forceDeterministic || db.demoMode || !aiClient || !apiKey || now < rateLimitedUntil) {
    return fallbackFn();
  }

  try {
    const apiPromise = aiClient.models.generateContent({
      model: MODEL_NAME,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 4000)
    );

    const response = await Promise.race([apiPromise, timeoutPromise]);

    const text = response.text?.trim();
    if (!text) {
      return fallbackFn();
    }
    const parsed = JSON.parse(text) as T;
    return parsed;
  } catch (err: any) {
    const errMsg = String(err?.message || err);
    if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded')) {
      rateLimitedUntil = Date.now() + 35000;
      console.log('[TrustPipeline] Gemini API rate limit reached (5 RPM). Circuit breaker active for 35s; using deterministic fallback.');
    } else if (!errMsg.includes('timeout')) {
      console.log('[TrustPipeline] Gemini call notice; using deterministic fallback.');
    }
    return fallbackFn();
  }
}

/* =========================================================================
   1. RESEARCHER AGENT
   ========================================================================= */
const RESEARCHER_SYSTEM_PROMPT = `You are a B2B sales research analyst. You are given one lead record from an
authorized mock dataset. Summarize what is known and what the likely business
needs are.

RULES
- Use ONLY the data provided. Never invent facts, news, or numbers.
- If something is not in the data, write "unknown".
- Be concise and specific.

Return ONLY valid JSON:
{
  "summary": "2 sentences max",
  "likely_pain_points": ["..."],
  "buying_signals": [{"signal": "...", "strength": 1-5}],
  "recommended_angle": "one sentence on the best way to open the conversation"
}`;

export async function runResearcherAgent(lead: Lead, forceDeterministic = false): Promise<ResearchSummary> {
  const fallback = (): ResearchSummary => {
    const isOps = lead.role.toLowerCase().includes('operat') || lead.role.toLowerCase().includes('coo');
    const isSales = lead.role.toLowerCase().includes('sales');
    const painPoints: string[] = [];

    if (lead.signals.includes('uses manual spreadsheets')) {
      painPoints.push('Time-consuming spreadsheet synchronization and error-prone tracking');
    }
    if (lead.signals.includes('hiring sales or ops roles')) {
      painPoints.push('Scaling bottlenecks while onboarding new headcount');
    }
    if (painPoints.length === 0) {
      painPoints.push(`Workflow coordination friction across ${lead.company_size}-person team in ${lead.industry}`);
    }

    const buyingSignals = lead.signals.map((sig) => {
      let strength = 3;
      if (sig === 'recent funding' || sig === 'visited pricing page') strength = 5;
      if (sig === 'posted about automation' || sig === 'hiring sales or ops roles') strength = 4;
      if (sig === 'uses manual spreadsheets') strength = 4;
      return { signal: sig, strength };
    });

    return {
      summary: `${lead.name} leads ${lead.role} at ${lead.company}, a ${lead.company_size}-person ${lead.industry} organization. Identified signals indicate active operational scaling and automation interest.`,
      likely_pain_points: painPoints,
      buying_signals: buyingSignals,
      recommended_angle: isOps
        ? `Focus on eliminating manual handoffs and automating multi-system data flows.`
        : isSales
        ? `Highlight how streamlined CRM automations free up reps for high-touch selling.`
        : `Emphasize modular workflow infrastructure that scales with company expansion.`,
    };
  };

  const userPrompt = JSON.stringify({
    name: lead.name,
    company: lead.company,
    role: lead.role,
    industry: lead.industry,
    company_size: lead.company_size,
    signals: lead.signals,
    notes: lead.owner_notes,
  });

  const res = await callGeminiJson<ResearchSummary>(
    RESEARCHER_SYSTEM_PROMPT,
    userPrompt,
    fallback,
    forceDeterministic
  );

  db.logAudit({
    lead_id: lead.id,
    lead_name: lead.name,
    agent: 'Researcher',
    action: 'ENRICH_LEAD',
    decision: 'ALLOW',
    reason: `Enriched profile with ${res.likely_pain_points.length} pain points and ${res.buying_signals.length} buying signals.`,
  });

  return res;
}

/* =========================================================================
   2. SCORER AGENT
   ========================================================================= */
const SCORER_SYSTEM_PROMPT = `You are a lead-scoring analyst. Score the lead from 0 to 100 against the Ideal
Customer Profile (ICP) provided. Explain every point.

RULES
- Start from a base of 50. Add or subtract points for each factor.
- Factors should cover: industry fit, company size fit, role/decision-making
  power, buying signals, and any red flags.
- The listed factor points must add up to the final score minus the base of 50
  (clamp the final score to 0-100).
- Reasons must reference actual data from the lead. Do not invent facts.
- Negative factors are allowed and encouraged when justified.

Return ONLY valid JSON:
{
  "score": 0-100,
  "factors": [{"factor": "...", "points": -20 to 20, "reason": "..."}],
  "summary": "one sentence verdict"
}`;

export async function runScorerAgent(lead: Lead, forceDeterministic = false): Promise<ScoreExplanation> {
  const fallback = (): ScoreExplanation => {
    let delta = 0;
    const factors: Array<{ factor: string; points: number; reason: string }> = [];

    // 1. Industry fit
    if (flowDeskICP.target_industries.includes(lead.industry)) {
      factors.push({
        factor: 'Target Industry Fit',
        points: 12,
        reason: `${lead.industry} is one of our tier-1 core target industries.`,
      });
      delta += 12;
    } else {
      factors.push({
        factor: 'Out of ICP Industry',
        points: -15,
        reason: `${lead.industry} is outside our supported automation domains.`,
      });
      delta -= 15;
    }

    // 2. Company size fit
    const [minSize, maxSize] = flowDeskICP.company_size_range;
    if (lead.company_size >= minSize && lead.company_size <= maxSize) {
      factors.push({
        factor: 'Optimal Company Size',
        points: 10,
        reason: `${lead.company_size} employees matches sweet spot (${minSize}-${maxSize}).`,
      });
      delta += 10;
    } else if (lead.company_size < 10) {
      factors.push({
        factor: 'Severely Under Minimum Size',
        points: -20,
        reason: `Only ${lead.company_size} employees (< 10); lacks scale for enterprise automation.`,
      });
      delta -= 20;
    } else if (lead.company_size < minSize) {
      factors.push({
        factor: 'Below Size Bracket',
        points: -6,
        reason: `${lead.company_size} employees is slightly below target range (${minSize}-${maxSize}).`,
      });
      delta -= 6;
    } else {
      factors.push({
        factor: 'Above Standard Size Bracket',
        points: 4,
        reason: `${lead.company_size} employees represents large account potential with complex procurement.`,
      });
      delta += 4;
    }

    // 3. Role / decision maker
    const roleLower = lead.role.toLowerCase();
    const isTargetRole = flowDeskICP.target_roles.some((r) =>
      roleLower.includes(r.toLowerCase())
    );
    if (isTargetRole) {
      factors.push({
        factor: 'High Decision Authority',
        points: 12,
        reason: `${lead.role} possesses direct budget allocation and signing authority.`,
      });
      delta += 12;
    } else if (roleLower.includes('coordinator') || roleLower.includes('researcher') || lead.signals.includes('no decision-making role')) {
      factors.push({
        factor: 'Low Decision Authority',
        points: -14,
        reason: `${lead.role} does not control departmental software purchases.`,
      });
      delta -= 14;
    } else {
      factors.push({
        factor: 'Influencer / Mid-Level Role',
        points: 2,
        reason: `${lead.role} can champion internally but requires executive sponsor.`,
      });
      delta += 2;
    }

    // 4. Signals
    lead.signals.forEach((sig) => {
      if (sig === 'recent funding') {
        factors.push({
          factor: 'Buying Signal: Recent Funding',
          points: 8,
          reason: 'Infusion of growth capital drives tooling modernization.',
        });
        delta += 8;
      } else if (sig === 'visited pricing page') {
        factors.push({
          factor: 'Buying Signal: Visited Pricing Page',
          points: 8,
          reason: 'High buying intent demonstrated through pricing page visit.',
        });
        delta += 8;
      } else if (sig === 'posted about automation') {
        factors.push({
          factor: 'Buying Signal: Automation Demand',
          points: 6,
          reason: 'Public engagement around workflow automation needs.',
        });
        delta += 6;
      } else if (sig === 'uses manual spreadsheets') {
        factors.push({
          factor: 'Buying Signal: Spreadsheet Friction',
          points: 6,
          reason: 'Direct match for automated pipeline replacement.',
        });
        delta += 6;
      } else if (sig === 'hiring sales or ops roles') {
        factors.push({
          factor: 'Buying Signal: Team Expansion',
          points: 5,
          reason: 'Active headcount growth in sales/ops amplifies tooling ROI.',
        });
        delta += 5;
      } else if (sig === 'recently signed with a competitor') {
        factors.push({
          factor: 'Red Flag: Competitor Contract Active',
          points: -18,
          reason: 'Recently signed multi-year contract with rival vendor.',
        });
        delta -= 18;
      }
    });

    const finalScore = Math.max(0, Math.min(100, 50 + delta));
    return {
      score: finalScore,
      factors,
      summary:
        finalScore >= 80
          ? `Top tier ICP match (${finalScore}/100) with strong authority and multiple active buying signals.`
          : finalScore >= 50
          ? `Moderate fit (${finalScore}/100) meeting core parameters with standard qualification needed.`
          : `Low ICP compatibility (${finalScore}/100) due to out-of-bracket size, role, or negative factors.`,
    };
  };

  const userPrompt = JSON.stringify({
    icp: flowDeskICP,
    lead: {
      name: lead.name,
      company: lead.company,
      role: lead.role,
      industry: lead.industry,
      company_size: lead.company_size,
      signals: lead.signals,
    },
  });

  const res = await callGeminiJson<ScoreExplanation>(
    SCORER_SYSTEM_PROMPT,
    userPrompt,
    fallback,
    forceDeterministic
  );

  // Compute lane
  const lane: LaneType = res.score >= 80 ? 'green' : res.score >= 50 ? 'yellow' : 'red';

  db.logAudit({
    lead_id: lead.id,
    lead_name: lead.name,
    agent: 'Scorer',
    action: 'EVALUATE_ICP_SCORE',
    decision: 'ALLOW',
    reason: `Calculated ICP score of ${res.score}/100 across ${res.factors.length} factors -> Lane [${lane.toUpperCase()}].`,
    confidence: res.score / 100,
  });

  return res;
}

/* =========================================================================
   3. WRITER AGENT
   ========================================================================= */
const WRITER_SYSTEM_PROMPT = `You are an empathetic B2B sales writer. Write one personalized outreach email
for the lead using the research provided. You help a human salesperson. You do
not replace the relationship.

RULES
- Reference exactly one real, specific detail about the lead from the data.
- Tone by role: executives get short and direct (under 90 words); technical or
  operations roles get more detail (up to 150 words).
- One clear, low-pressure call to action (for example, "Worth a 15-minute chat?").
- Never fabricate claims, statistics, customer names, or testimonials.
- No pressure tactics, fake urgency, or misleading subject lines.
- The last line MUST be: "Reply STOP and I won't contact you again."
- For follow-ups, reference the previous conversation and add something new.
  Do not repeat the first email.

Return ONLY valid JSON:
{
  "subject": "...",
  "body": "...",
  "tone_used": "executive_short | technical_detailed | friendly_neutral",
  "personalization_hooks": ["..."]
}`;

export interface DraftEmailResult {
  subject: string;
  body: string;
  tone_used: 'executive_short' | 'technical_detailed' | 'friendly_neutral';
  personalization_hooks: string[];
}

export async function runWriterAgent(
  lead: Lead,
  context?: { isFollowUp?: boolean; previousNote?: string },
  forceDeterministic = false
): Promise<DraftEmailResult> {
  const isExec = /ceo|coo|vp|chief/i.test(lead.role);
  const tone: 'executive_short' | 'technical_detailed' | 'friendly_neutral' = isExec
    ? 'executive_short'
    : 'technical_detailed';

  const fallback = (): DraftEmailResult => {
    const hook = lead.signals.includes('recent funding')
      ? `${lead.company}'s recent funding milestone`
      : lead.signals.includes('uses manual spreadsheets')
      ? `reducing manual spreadsheet coordination in your ops workflow`
      : lead.signals.includes('hiring sales or ops roles')
      ? `scaling sales and operations onboarding at ${lead.company}`
      : `scaling workflows across your ${lead.company_size}-person team`;

    if (context?.isFollowUp) {
      return {
        subject: `Re: Automating workflows at ${lead.company}`,
        body: `Hi ${lead.name},\n\nCircling back following up on our previous note. Knowing that ${hook} remains a key focus for ${lead.company}, wanted to share a 2-minute overview of how FlowDesk automates mid-market handoffs.\n\nWould a brief 10-minute touchpoint this Thursday be helpful?\n\nBest regards,\nTrustPipeline Autopilot\n\nReply STOP and I won't contact you again.`,
        tone_used: tone,
        personalization_hooks: [hook],
      };
    }

    if (isExec) {
      return {
        subject: `Quick question regarding ${lead.company}'s workflow automation`,
        body: `Hi ${lead.name},\n\nI noticed ${hook}. Many ${lead.industry} executives find that manual cross-tool handoffs consume 15+ hours weekly per manager.\n\nFlowDesk connects your existing tools so your team focuses on growth rather than operational friction.\n\nWorth a 15-minute chat next week?\n\nBest,\nTrustPipeline Autopilot\n\nReply STOP and I won't contact you again.`,
        tone_used: 'executive_short',
        personalization_hooks: [hook],
      };
    } else {
      return {
        subject: `Streamlining workflow handoffs at ${lead.company}`,
        body: `Hi ${lead.name},\n\nGiven your focus as ${lead.role} at ${lead.company}, I wanted to reach out regarding ${hook}.\n\nWhen teams scale to ${lead.company_size} people, repetitive handoffs between systems often create bottlenecks that slow down execution. FlowDesk provides autonomous workflow orchestration that connects your stack without rigid coding.\n\nOpen to reviewing a brief walkthrough if this aligns with your current priorities?\n\nWarm regards,\nTrustPipeline Autopilot\n\nReply STOP and I won't contact you again.`,
        tone_used: 'technical_detailed',
        personalization_hooks: [hook],
      };
    }
  };

  const userPrompt = JSON.stringify({
    lead: {
      name: lead.name,
      company: lead.company,
      role: lead.role,
      industry: lead.industry,
      company_size: lead.company_size,
      signals: lead.signals,
    },
    research: lead.research_summary,
    context,
  });

  const res = await callGeminiJson<DraftEmailResult>(
    WRITER_SYSTEM_PROMPT,
    userPrompt,
    fallback,
    forceDeterministic
  );

  // Guarantee mandatory opt-out safeguard on last line
  if (!res.body.includes("Reply STOP and I won't contact you again.")) {
    res.body += "\n\nReply STOP and I won't contact you again.";
  }

  db.logAudit({
    lead_id: lead.id,
    lead_name: lead.name,
    agent: 'Writer',
    action: context?.isFollowUp ? 'DRAFT_FOLLOWUP_EMAIL' : 'DRAFT_OUTREACH_EMAIL',
    decision: 'ALLOW',
    reason: `Generated ${res.tone_used} email referencing hook: "${res.personalization_hooks[0] || 'company growth'}". Consent footer appended.`,
  });

  return res;
}

/* =========================================================================
   4. REPLY READER AGENT
   ========================================================================= */
const REPLY_READER_SYSTEM_PROMPT = `You are a reply-intelligence analyst. Classify a prospect's reply to a sales
email. Today's simulated date is {{current_date}}.

CLASSIFICATIONS
- interested: wants to talk, asks for info, or agrees to a meeting
- not_now: interested later or busy. Extract or infer a follow-up date.
- unsubscribe: any request to stop contact, in any wording (stop, remove me,
  don't email me, take me off, not interested, do not contact)
- referral: points to a colleague. Extract name and email if present.
- angry_or_confused: upset, hostile, threatening, complaining, or clearly
  confused about who we are
- out_of_office: automatic away message
- other: anything else

RULES
- Convert relative dates ("in January", "next quarter", "after the 15th") into
  an absolute date (YYYY-MM-DD) based on the simulated current date.
- If the reply mentions legal action, complaints, pricing negotiation, or
  contract terms, set "sensitive": true.
- Confidence is 0 to 1. Be honest. Use lower confidence for ambiguous text.
- When a reply contains both a refusal and a positive word, prefer unsubscribe.

Return ONLY valid JSON:
{
  "classification": "...",
  "confidence": 0.0-1.0,
  "sensitive": true | false,
  "reasoning": "one sentence",
  "extracted": {
    "follow_up_date": "YYYY-MM-DD or null",
    "referral_name": "string or null",
    "referral_email": "string or null",
    "sentiment": "positive | neutral | negative"
  }
}`;

export interface ReplyAnalysisResult {
  classification: ReplyClassification;
  confidence: number;
  sensitive: boolean;
  reasoning: string;
  extracted: ExtractedReplyData;
  assignedLane: LaneType;
}

export async function runReplyReaderAgent(
  replyText: string,
  simulatedDate: string = db.simulatedDate,
  leadScore: number = 70,
  forceDeterministic = false
): Promise<ReplyAnalysisResult> {
  const fallback = (): Omit<ReplyAnalysisResult, 'assignedLane'> => {
    const textLower = replyText.toLowerCase().trim();

    // 1. Unsubscribe checks (Zero tolerance / highest priority)
    const unsubKeywords = [
      'unsubscribe',
      'stop emailing',
      'stop',
      'remove me',
      'not interested',
      'do not contact',
      'don’t email',
      'dont email',
      'take me off',
    ];
    if (unsubKeywords.some((k) => textLower.includes(k))) {
      return {
        classification: 'unsubscribe',
        confidence: 0.98,
        sensitive: false,
        reasoning: 'Explicit opt-out keyword detected; consent policy mandates immediate suppression.',
        extracted: {
          follow_up_date: null,
          referral_name: null,
          referral_email: null,
          sentiment: 'negative',
        },
      };
    }

    // 2. Angry / Confused / Threats
    if (
      textLower.includes('spam') ||
      textLower.includes('report') ||
      textLower.includes('who are you') ||
      textLower.includes('how did you get') ||
      textLower.includes('harass') ||
      textLower.includes('illegal')
    ) {
      return {
        classification: 'angry_or_confused',
        confidence: 0.95,
        sensitive: true,
        reasoning: 'Prospect expressed frustration, privacy concern, or threat to report as spam.',
        extracted: {
          follow_up_date: null,
          referral_name: null,
          referral_email: null,
          sentiment: 'negative',
        },
      };
    }

    // 3. Out of office
    if (
      textLower.includes('out of office') ||
      textLower.includes('ooo') ||
      textLower.includes('away from my desk') ||
      textLower.includes('auto-reply')
    ) {
      return {
        classification: 'out_of_office',
        confidence: 0.96,
        sensitive: false,
        reasoning: 'Automated out-of-office autoreply detected.',
        extracted: {
          follow_up_date: '2026-10-20',
          referral_name: null,
          referral_email: null,
          sentiment: 'neutral',
        },
      };
    }

    // 4. Referral
    if (
      textLower.includes('talk to') ||
      textLower.includes('speak with') ||
      textLower.includes('reach out to') ||
      textLower.includes('try our') ||
      textLower.includes('not the right person')
    ) {
      const emailMatch = replyText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
      let refName: string | null = null;
      if (textLower.includes('priya')) refName = 'Priya';
      else if (textLower.includes('arjun')) refName = 'Arjun (CTO)';

      return {
        classification: 'referral',
        confidence: 0.92,
        sensitive: false,
        reasoning: 'Prospect referred conversation to an alternative internal colleague.',
        extracted: {
          follow_up_date: null,
          referral_name: refName,
          referral_email: emailMatch ? emailMatch[1] : null,
          sentiment: 'neutral',
        },
      };
    }

    // 5. Not now (temporal postponement)
    if (
      textLower.includes('not right now') ||
      textLower.includes('not now') ||
      textLower.includes('january') ||
      textLower.includes('q2') ||
      textLower.includes('next quarter') ||
      textLower.includes('busy until') ||
      textLower.includes('circle back')
    ) {
      let targetDate = '2027-01-15';
      if (textLower.includes('q2')) targetDate = '2027-04-01';
      else if (textLower.includes('january')) targetDate = '2027-01-10';

      return {
        classification: 'not_now',
        confidence: 0.93,
        sensitive: false,
        reasoning: 'Prospect requested temporal postponement; scheduled follow-up window inferred.',
        extracted: {
          follow_up_date: targetDate,
          referral_name: null,
          referral_email: null,
          sentiment: 'neutral',
        },
      };
    }

    // 6. Interested
    if (
      textLower.includes('sounds interesting') ||
      textLower.includes('can we talk') ||
      textLower.includes('send me more details') ||
      textLower.includes('let’s chat') ||
      textLower.includes('thursday') ||
      textLower.includes('more info')
    ) {
      return {
        classification: 'interested',
        confidence: 0.94,
        sensitive: false,
        reasoning: 'Prospect expressed positive buying interest and requested next engagement step.',
        extracted: {
          follow_up_date: null,
          referral_name: null,
          referral_email: null,
          sentiment: 'positive',
        },
      };
    }

    // 7. Sensitive pricing / competitor / other
    const isPricing = textLower.includes('cost') || textLower.includes('discount') || textLower.includes('pricing');
    return {
      classification: 'other',
      confidence: textLower.length < 15 ? 0.55 : 0.72,
      sensitive: isPricing,
      reasoning: isPricing
        ? 'Prospect introduced commercial negotiation and pricing inquiry.'
        : 'Inconclusive reply or ambiguous statement requiring manual human review.',
      extracted: {
        follow_up_date: null,
        referral_name: null,
        referral_email: null,
        sentiment: 'neutral',
      },
    };
  };

  const sysPrompt = REPLY_READER_SYSTEM_PROMPT.replace('{{current_date}}', simulatedDate);
  const rawResult = await callGeminiJson<Omit<ReplyAnalysisResult, 'assignedLane'>>(
    sysPrompt,
    replyText,
    fallback,
    forceDeterministic
  );

  // Apply Lane Rules:
  // - GREEN: confidence >= 0.85 and not sensitive -> auto-processed
  // - YELLOW: confidence 0.60 to 0.85 -> Human Review Queue (Approve / Edit / Reject)
  // - RED: confidence < 0.60, OR angry_or_confused, OR legal / complaint / pricing negotiation language, OR a lead with score >= 90 that replied "interested" -> escalate to human
  // - Unsubscribe is ALWAYS executed immediately regardless of confidence
  let assignedLane: LaneType = 'green';

  if (
    rawResult.classification === 'angry_or_confused' ||
    rawResult.sensitive ||
    rawResult.confidence < 0.6 ||
    (leadScore >= 90 && rawResult.classification === 'interested')
  ) {
    assignedLane = 'red';
  } else if (rawResult.confidence >= 0.85 && !rawResult.sensitive) {
    assignedLane = 'green';
  } else {
    assignedLane = 'yellow';
  }

  return {
    ...rawResult,
    assignedLane,
  };
}

/* =========================================================================
   5. HUMAN ESCALATION BRIEFING (RED LANE)
   ========================================================================= */
const ESCALATION_SYSTEM_PROMPT = `You are an assistant preparing a briefing for a human salesperson who must take
over a conversation. Be brief, neutral, and factual.

Return ONLY valid JSON:
{
  "who": "name, role, company",
  "what_they_said": "one sentence",
  "why_escalated": "one sentence",
  "suggested_next_step": "one sentence",
  "tone_advice": "one sentence on how to respond"
}`;

export async function generateEscalationBriefing(
  lead: Lead,
  replyText: string,
  analysis: ReplyAnalysisResult
): Promise<EscalationBriefing> {
  const fallback = (): EscalationBriefing => {
    let why = 'Confidence below threshold or ambiguous sentiment.';
    let step = 'Review account background and send personalized manual response.';
    let tone = 'Professional, concise and empathetic.';

    if (analysis.classification === 'angry_or_confused') {
      why = 'Prospect expressed strong frustration or questioned outreach provenance.';
      step = 'Apologize warmly, offer immediate suppression confirmation, and de-escalate.';
      tone = 'Calm, respectful, apologetic, and de-escalating.';
    } else if (analysis.sensitive) {
      why = 'Prospect raised contractual pricing or enterprise discount negotiation.';
      step = 'Prepare custom commercial tier proposal and schedule dedicated account exec call.';
      tone = 'Consultative, enterprise-grade, and commercially flexible.';
    } else if (lead.score >= 90 && analysis.classification === 'interested') {
      why = `High-value enterprise lead (Score: ${lead.score}/100) requested meeting; human relationship priority.`;
      step = 'Engage directly with calendar link within 15 minutes to secure discovery call.';
      tone = 'High-touch, executive, eager, and accommodating.';
    }

    return {
      who: `${lead.name}, ${lead.role} at ${lead.company} (${lead.industry}, ${lead.company_size} employees)`,
      what_they_said: replyText.length > 80 ? replyText.substring(0, 77) + '...' : replyText,
      why_escalated: why,
      suggested_next_step: step,
      tone_advice: tone,
    };
  };

  const userPrompt = JSON.stringify({
    lead: {
      name: lead.name,
      role: lead.role,
      company: lead.company,
      industry: lead.industry,
      company_size: lead.company_size,
      score: lead.score,
    },
    reply_text: replyText,
    classification: analysis.classification,
    sensitive: analysis.sensitive,
    confidence: analysis.confidence,
  });

  const res = await callGeminiJson<EscalationBriefing>(
    ESCALATION_SYSTEM_PROMPT,
    userPrompt,
    fallback
  );

  return res;
}
