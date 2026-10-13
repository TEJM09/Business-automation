import { Lead } from '../src/types';
import { db } from './db';

export interface GuardianCheckResult {
  allowed: boolean;
  decision: 'ALLOW' | 'BLOCK';
  reason: string;
  rule_triggered?: string;
}

// Simple email format validator
function isValidEmail(email?: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || !trimmed.includes('@')) return false;
  // Basic regex check for user@domain.tld
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(trimmed);
}

// Fuzzy name similarity check
function isFuzzyNameMatch(nameA: string, nameB: string): boolean {
  const normA = nameA.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normB = nameB.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normA === normB) return true;
  if (normA.length > 3 && normB.length > 3) {
    if (normA.includes(normB) || normB.includes(normA)) return true;
    // Check common nicknames
    const pairs = [
      ['dave', 'david'],
      ['sara', 'sarah'],
      ['dan', 'daniel'],
      ['alex', 'alexander'],
      ['mike', 'michael'],
      ['chris', 'christopher'],
    ];
    for (const [p1, p2] of pairs) {
      if (
        (normA.includes(p1) && normB.includes(p2)) ||
        (normA.includes(p2) && normB.includes(p1))
      ) {
        return true;
      }
    }
  }
  return false;
}

export class ConsentGuardian {
  /**
   * Deterministic checks run in strict order.
   * First failure blocks immediately.
   */
  public static evaluateOutbound(lead: Lead): GuardianCheckResult {
    // 1. Email is missing or invalid
    if (!lead.email || !isValidEmail(lead.email)) {
      const reason = !lead.email
        ? 'Email address is missing from lead record.'
        : `Email '${lead.email}' has an invalid format or missing TLD.`;
      db.logAudit({
        lead_id: lead.id,
        lead_name: lead.name,
        agent: 'ConsentGuardian',
        action: 'OUTBOUND_PERMISSION_CHECK',
        decision: 'BLOCK',
        reason: `[Rule 1: Invalid Email] ${reason}`,
      });
      return {
        allowed: false,
        decision: 'BLOCK',
        reason,
        rule_triggered: 'Rule 1: Missing or invalid email',
      };
    }

    // 2. Email is in suppression list
    if (db.isSuppressed(lead.email)) {
      const reason = `Email '${lead.email}' is on the permanent suppression list (opted out previously).`;
      db.logAudit({
        lead_id: lead.id,
        lead_name: lead.name,
        agent: 'ConsentGuardian',
        action: 'OUTBOUND_PERMISSION_CHECK',
        decision: 'BLOCK',
        reason: `[Rule 2: Suppression List] ${reason}`,
      });
      return {
        allowed: false,
        decision: 'BLOCK',
        reason,
        rule_triggered: 'Rule 2: Email in suppression list',
      };
    }

    // 3. Lead status is unsubscribed or escalated
    if (lead.status === 'unsubscribed' || lead.status === 'escalated') {
      const reason = `Lead status is '${lead.status}'; outbound contact prohibited without explicit re-consent.`;
      db.logAudit({
        lead_id: lead.id,
        lead_name: lead.name,
        agent: 'ConsentGuardian',
        action: 'OUTBOUND_PERMISSION_CHECK',
        decision: 'BLOCK',
        reason: `[Rule 3: Restricted Status] ${reason}`,
      });
      return {
        allowed: false,
        decision: 'BLOCK',
        reason,
        rule_triggered: `Rule 3: Lead status is ${lead.status}`,
      };
    }

    // 4. Duplicate contact (same email, or same person at same company by fuzzy match)
    const allLeads = db.getAllLeads();
    const existingDuplicates = allLeads.filter(
      (other) =>
        other.id !== lead.id &&
        (other.email?.toLowerCase().trim() === lead.email.toLowerCase().trim() ||
          (other.company?.toLowerCase() === lead.company?.toLowerCase() &&
            isFuzzyNameMatch(other.name, lead.name))) &&
        (other.status === 'contacted' ||
          other.status === 'replied' ||
          other.status === 'interested' ||
          other.status === 'not_now' ||
          other.status === 'scored')
    );

    if (existingDuplicates.length > 0) {
      const reason = `Duplicate prospect detected: already active in pipeline under '${existingDuplicates[0].name}' at ${existingDuplicates[0].company} (${existingDuplicates[0].id}).`;
      db.logAudit({
        lead_id: lead.id,
        lead_name: lead.name,
        agent: 'ConsentGuardian',
        action: 'OUTBOUND_PERMISSION_CHECK',
        decision: 'BLOCK',
        reason: `[Rule 4: Duplicate Lead] ${reason}`,
      });
      return {
        allowed: false,
        decision: 'BLOCK',
        reason,
        rule_triggered: 'Rule 4: Duplicate contact detected',
      };
    }

    // 5. Frequency cap: max 1 outbound per lead per 3 simulated days, max 3 total touches
    const messages = db.getMessagesForLead(lead.id).filter(
      (m) => m.direction === 'outbound' && m.status === 'sent_simulated'
    );

    if (messages.length >= 3) {
      const reason = `Touchpoint frequency cap reached (maximum 3 outbound attempts reached: ${messages.length} sent).`;
      db.logAudit({
        lead_id: lead.id,
        lead_name: lead.name,
        agent: 'ConsentGuardian',
        action: 'OUTBOUND_PERMISSION_CHECK',
        decision: 'BLOCK',
        reason: `[Rule 5: Touchpoint Limit] ${reason}`,
      });
      return {
        allowed: false,
        decision: 'BLOCK',
        reason,
        rule_triggered: 'Rule 5: Maximum touches reached',
      };
    }

    if (messages.length > 0) {
      // Check last sent date against simulated date
      const lastMsg = messages[messages.length - 1];
      const lastSentDate = new Date(lastMsg.created_at);
      const simDate = new Date(db.simulatedDate);
      const diffDays = Math.floor(
        (simDate.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays < 3 && diffDays >= 0) {
        const reason = `Cadence guard: Last outbound was sent ${diffDays} day(s) ago. Minimum cooling period is 3 simulated days.`;
        db.logAudit({
          lead_id: lead.id,
          lead_name: lead.name,
          agent: 'ConsentGuardian',
          action: 'OUTBOUND_PERMISSION_CHECK',
          decision: 'BLOCK',
          reason: `[Rule 5: Cadence Cap] ${reason}`,
        });
        return {
          allowed: false,
          decision: 'BLOCK',
          reason,
          rule_triggered: 'Rule 5: Minimum 3-day cooldown active',
        };
      }
    }

    // 6. Otherwise ALLOW
    const allowReason = 'Passed all 5 Guardian safety and consent rules (Valid email, not suppressed, no duplicate, cadence verified).';
    db.logAudit({
      lead_id: lead.id,
      lead_name: lead.name,
      agent: 'ConsentGuardian',
      action: 'OUTBOUND_PERMISSION_CHECK',
      decision: 'ALLOW',
      reason: allowReason,
    });

    return {
      allowed: true,
      decision: 'ALLOW',
      reason: allowReason,
    };
  }

  /**
   * Immediate Unsubscribe execution (Zero-tolerance consent protocol).
   * Always executed immediately regardless of confidence.
   */
  public static executeUnsubscribe(leadId: string, email: string, source: string) {
    // 1. Add to permanent suppression list
    db.addToSuppression(email, `Unsubscribed via reply: "${source}"`);

    // 2. Cancel all pending follow-ups
    db.cancelPendingFollowUps(leadId, 'Prospect requested unsubscribe');

    // 3. Update lead status
    const lead = db.updateLead(leadId, {
      status: 'unsubscribed',
      owner_notes: `[UNSUBSCRIBED ${db.simulatedDate}] Opted out via: "${source}"`,
    });

    // 4. Log to audit trail
    db.logAudit({
      lead_id: leadId,
      lead_name: lead?.name,
      agent: 'ConsentGuardian',
      action: 'EXECUTE_UNSUBSCRIBE',
      decision: 'ALLOW',
      reason: `Immediate opt-out enacted: email ${email} added to suppression list, follow-ups cancelled, status set to unsubscribed.`,
    });
  }
}
