import {
  AuditLogEntry,
  FollowUp,
  Lead,
  Message,
  ReplyRecord,
  ReviewQueueItem,
  SuppressionRecord,
} from '../src/types';
import { initialRawLeads, initialSuppressionList } from './seedData';

class DatabaseStore {
  public leads: Map<string, Lead> = new Map();
  public messages: Message[] = [];
  public replies: ReplyRecord[] = [];
  public followUps: FollowUp[] = [];
  public suppressionList: SuppressionRecord[] = [];
  public auditLog: AuditLogEntry[] = [];
  public reviewQueue: ReviewQueueItem[] = [];
  public simulatedDate: string = '2026-10-12';
  public demoMode: boolean = false;

  constructor() {
    this.reset();
  }

  public reset() {
    this.leads.clear();
    this.messages = [];
    this.replies = [];
    this.followUps = [];
    this.auditLog = [];
    this.reviewQueue = [];
    this.simulatedDate = '2026-10-12';

    // Clone suppression list
    this.suppressionList = initialSuppressionList.map((item) => ({ ...item }));

    // Initialize raw leads
    initialRawLeads.forEach((raw) => {
      const lead: Lead = {
        ...raw,
        score: raw.score ?? 50,
        lane: raw.lane ?? 'yellow',
        status: raw.status ?? 'new',
        signals: [...raw.signals],
        created_at: raw.created_at,
        updated_at: raw.updated_at,
      };
      this.leads.set(lead.id, lead);
    });

    this.logAudit({
      lead_id: 'SYSTEM',
      lead_name: 'TrustPipeline System',
      agent: 'Supervisor',
      action: 'SYSTEM_RESET',
      decision: 'ALLOW',
      reason: 'Database initialized with 40 leads and seed suppression list.',
    });
  }

  public getLead(id: string): Lead | undefined {
    return this.leads.get(id);
  }

  public getAllLeads(): Lead[] {
    return Array.from(this.leads.values());
  }

  public updateLead(id: string, updates: Partial<Lead>): Lead | undefined {
    const existing = this.leads.get(id);
    if (!existing) return undefined;
    const updated: Lead = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.leads.set(id, updated);
    return updated;
  }

  public addMessage(msg: Message) {
    this.messages.push(msg);
  }

  public getMessagesForLead(leadId: string): Message[] {
    return this.messages.filter((m) => m.lead_id === leadId);
  }

  public addReply(reply: ReplyRecord) {
    this.replies.push(reply);
  }

  public getRepliesForLead(leadId: string): ReplyRecord[] {
    return this.replies.filter((r) => r.lead_id === leadId);
  }

  public addFollowUp(fu: FollowUp) {
    this.followUps.push(fu);
  }

  public getFollowUpsForLead(leadId: string): FollowUp[] {
    return this.followUps.filter((f) => f.lead_id === leadId);
  }

  public cancelPendingFollowUps(leadId: string, reason: string) {
    this.followUps.forEach((fu) => {
      if (fu.lead_id === leadId && fu.status === 'pending') {
        fu.status = 'cancelled';
        this.logAudit({
          lead_id: leadId,
          agent: 'ConsentGuardian',
          action: 'CANCEL_FOLLOWUP',
          decision: 'ALLOW',
          reason: `Pending follow-up cancelled: ${reason}`,
        });
      }
    });
  }

  public addToSuppression(email: string, reason: string): SuppressionRecord {
    const normalized = email.toLowerCase().trim();
    const existing = this.suppressionList.find((s) => s.email.toLowerCase() === normalized);
    if (existing) return existing;

    const record: SuppressionRecord = {
      id: `supp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: normalized,
      reason,
      created_at: new Date().toISOString(),
    };
    this.suppressionList.push(record);
    return record;
  }

  public isSuppressed(email: string): boolean {
    if (!email) return false;
    const normalized = email.toLowerCase().trim();
    return this.suppressionList.some((s) => s.email.toLowerCase() === normalized);
  }

  public logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.auditLog.unshift(fullEntry);
    return fullEntry;
  }

  public getAuditLog(): AuditLogEntry[] {
    return this.auditLog;
  }

  public addQueueItem(item: ReviewQueueItem) {
    this.reviewQueue.unshift(item);
  }

  public getQueueItems(status?: 'pending' | 'approved' | 'rejected' | 'handled'): ReviewQueueItem[] {
    if (status) {
      return this.reviewQueue.filter((q) => q.status === status);
    }
    return this.reviewQueue;
  }

  public updateQueueItem(id: string, updates: Partial<ReviewQueueItem>): ReviewQueueItem | undefined {
    const item = this.reviewQueue.find((q) => q.id === id);
    if (item) {
      Object.assign(item, updates);
    }
    return item;
  }
}

export const db = new DatabaseStore();
