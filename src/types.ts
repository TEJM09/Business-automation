export type LaneType = 'green' | 'yellow' | 'red';

export type LeadStatus =
  | 'new'
  | 'enriched'
  | 'scored'
  | 'contacted'
  | 'replied'
  | 'interested'
  | 'not_now'
  | 'referred'
  | 'unsubscribed'
  | 'escalated'
  | 'blocked_duplicate'
  | 'closed';

export interface ScoreFactor {
  factor: string;
  points: number;
  reason: string;
}

export interface ScoreExplanation {
  score: number;
  factors: ScoreFactor[];
  summary: string;
}

export interface ResearchSummary {
  summary: string;
  likely_pain_points: string[];
  buying_signals: Array<{ signal: string; strength: number }>;
  recommended_angle: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  industry: string;
  company_size: number;
  signals: string[];
  status: LeadStatus;
  score: number;
  score_explanation?: ScoreExplanation;
  lane: LaneType;
  owner_notes: string;
  research_summary?: ResearchSummary;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  lead_id: string;
  direction: 'outbound' | 'inbound';
  subject: string;
  body: string;
  status: 'draft' | 'pending_approval' | 'sent_simulated' | 'blocked';
  tone_used?: 'executive_short' | 'technical_detailed' | 'friendly_neutral';
  personalization_hooks?: string[];
  created_at: string;
}

export type ReplyClassification =
  | 'interested'
  | 'not_now'
  | 'unsubscribe'
  | 'referral'
  | 'angry_or_confused'
  | 'out_of_office'
  | 'other';

export interface ExtractedReplyData {
  follow_up_date: string | null;
  referral_name: string | null;
  referral_email: string | null;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ReplyRecord {
  id: string;
  lead_id: string;
  message_id?: string;
  raw_text: string;
  classification: ReplyClassification;
  confidence: number;
  sensitive: boolean;
  reasoning: string;
  extracted: ExtractedReplyData;
  lane: LaneType;
  created_at: string;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  due_date: string;
  reason: string;
  status: 'pending' | 'done' | 'cancelled';
  created_at: string;
}

export interface SuppressionRecord {
  id: string;
  email: string;
  reason: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  lead_id: string;
  lead_name?: string;
  agent: 'Supervisor' | 'Researcher' | 'Scorer' | 'Writer' | 'ReplyReader' | 'ConsentGuardian' | 'HumanReviewer';
  action: string;
  decision: 'ALLOW' | 'BLOCK' | 'ESCALATE' | 'AUTO_EXECUTE' | 'APPROVED' | 'REJECTED' | 'MANUAL_TAKEOVER';
  reason: string;
  confidence?: number;
}

export interface EscalationBriefing {
  who: string;
  what_they_said: string;
  why_escalated: string;
  suggested_next_step: string;
  tone_advice: string;
}

export interface ReviewQueueItem {
  id: string;
  lead_id: string;
  lead_name: string;
  company: string;
  role: string;
  type: 'draft_approval' | 'reply_takeover' | 'sensitive_reply';
  lane: 'yellow' | 'red';
  context_text: string;
  confidence: number;
  briefing: EscalationBriefing;
  status: 'pending' | 'approved' | 'rejected' | 'handled';
  created_at: string;
}

export interface ICP {
  product: string;
  target_industries: string[];
  company_size_range: [number, number];
  target_roles: string[];
  positive_signals: string[];
  negative_signals: string[];
}

export interface TestReplyItem {
  id: number;
  reply_text: string;
  expected_label: ReplyClassification;
  description?: string;
}

export interface EvaluationResult {
  total: number;
  correct: number;
  accuracy: number;
  tested_at: string;
  per_class: Record<string, { total: number; correct: number; accuracy: number }>;
  items: Array<{
    id: number;
    reply_text: string;
    expected: string;
    predicted: string;
    confidence: number;
    correct: boolean;
    reasoning: string;
  }>;
}

export interface PipelineStats {
  total_leads: number;
  contacted_leads: number;
  replied_leads: number;
  interested_leads: number;
  unsubscribed_count: number;
  duplicates_blocked: number;
  invalid_blocked: number;
  escalated_count: number;
  time_saved_minutes: number;
  opt_outs_honored_percent: number;
  trust_score: number;
  lanes: {
    green: number;
    yellow: number;
    red: number;
  };
  funnel: {
    new: number;
    scored: number;
    contacted: number;
    replied: number;
    interested: number;
  };
}
