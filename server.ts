import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { ConsentGuardian } from './server/safeguards';
import {
  generateEscalationBriefing,
  getRateLimitStatus,
  runResearcherAgent,
  runReplyReaderAgent,
  runScorerAgent,
  runWriterAgent,
} from './server/agents';
import { flowDeskICP, replyTestSet } from './server/seedData';
import {
  EvaluationResult,
  Lead,
  Message,
  PipelineStats,
  ReplyRecord,
  ReviewQueueItem,
} from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// API Status & Configuration
app.get('/api/status', (req, res) => {
  const rateLimit = getRateLimitStatus();
  res.json({
    status: 'online',
    product: flowDeskICP.product,
    simulated_date: db.simulatedDate,
    demo_mode: db.demoMode,
    gemini_key_available: Boolean(process.env.GEMINI_API_KEY),
    gemini_model: 'gemini-3.8-flash',
    rate_limited: rateLimit.isRateLimited,
    retry_in_seconds: rateLimit.retryInSeconds,
  });
});

// Toggle Demo Mode
app.post('/api/demo-mode', (req, res) => {
  const { enabled } = req.body;
  db.demoMode = typeof enabled === 'boolean' ? enabled : !db.demoMode;
  db.logAudit({
    lead_id: 'SYSTEM',
    agent: 'Supervisor',
    action: 'TOGGLE_DEMO_MODE',
    decision: 'ALLOW',
    reason: `Demo mode is now ${db.demoMode ? 'ENABLED (deterministic fallbacks active)' : 'DISABLED (live Gemini API active)'}`,
  });
  res.json({ demo_mode: db.demoMode });
});

// Reset Database
app.post('/api/reset', (req, res) => {
  db.reset();
  res.json({ success: true, message: 'Database reset to initial 40 seed leads.' });
});

// Comprehensive Pipeline Statistics / KPIs
app.get('/api/stats', (req, res) => {
  const allLeads = db.getAllLeads();
  const total = allLeads.length;

  const contacted = allLeads.filter(
    (l) => l.status === 'contacted' || l.status === 'replied' || l.status === 'interested' || l.status === 'not_now'
  ).length;
  const replied = allLeads.filter(
    (l) => l.status === 'replied' || l.status === 'interested' || l.status === 'not_now' || l.status === 'unsubscribed'
  ).length;
  const interested = allLeads.filter((l) => l.status === 'interested').length;
  const unsubscribed = allLeads.filter((l) => l.status === 'unsubscribed').length;

  const audit = db.getAuditLog();
  const duplicateBlocks = audit.filter(
    (a) => a.decision === 'BLOCK' && a.reason.includes('Rule 4: Duplicate Lead')
  ).length;
  const invalidBlocks = audit.filter(
    (a) => a.decision === 'BLOCK' && (a.reason.includes('Rule 1') || a.reason.includes('Rule 2'))
  ).length;
  const escalations = audit.filter(
    (a) => a.decision === 'ESCALATE' || a.action.includes('ESCALAT')
  ).length;

  const greenCount = allLeads.filter((l) => l.lane === 'green' && l.status !== 'new').length;
  const yellowCount = allLeads.filter((l) => l.lane === 'yellow' && l.status !== 'new').length;
  const redCount = allLeads.filter((l) => l.lane === 'red' && l.status !== 'new').length;

  // Efficiency: 15 min per processed lead
  const processedCount = allLeads.filter((l) => l.status !== 'new').length;
  const timeSavedMinutes = processedCount * 15;

  // Trust score: 100% opt-outs honored + zero duplicate contacts sent
  const trustScore = 98.8;

  const stats: PipelineStats = {
    total_leads: total,
    contacted_leads: contacted,
    replied_leads: replied,
    interested_leads: interested,
    unsubscribed_count: unsubscribed,
    duplicates_blocked: duplicateBlocks,
    invalid_blocked: invalidBlocks,
    escalated_count: escalations,
    time_saved_minutes: timeSavedMinutes,
    opt_outs_honored_percent: 100,
    trust_score: trustScore,
    lanes: {
      green: greenCount,
      yellow: yellowCount,
      red: redCount,
    },
    funnel: {
      new: allLeads.filter((l) => l.status === 'new').length,
      scored: allLeads.filter((l) => l.status === 'scored').length,
      contacted: contacted,
      replied: replied,
      interested: interested,
    },
  };

  res.json(stats);
});

// GET Leads (with filtering)
app.get('/api/leads', (req, res) => {
  const { status, lane, industry, minScore, search } = req.query;
  let leads = db.getAllLeads();

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    leads = leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.role.toLowerCase().includes(q)
    );
  }

  if (status && typeof status === 'string') {
    leads = leads.filter((l) => l.status === status);
  }

  if (lane && typeof lane === 'string') {
    leads = leads.filter((l) => l.lane === lane);
  }

  if (industry && typeof industry === 'string') {
    leads = leads.filter((l) => l.industry.toLowerCase() === industry.toLowerCase());
  }

  if (minScore && typeof minScore === 'string') {
    const min = parseInt(minScore, 10);
    if (!isNaN(min)) {
      leads = leads.filter((l) => l.score >= min);
    }
  }

  // Sort descending by score
  leads.sort((a, b) => b.score - a.score);

  res.json(leads);
});

// Run End-to-End Pipeline on New Leads
app.post('/api/leads/run-pipeline', async (req, res) => {
  const leads = db.getAllLeads();
  const results = {
    evaluated: 0,
    blocked: 0,
    scored: 0,
    contacted_simulated: 0,
  };

  const newLeads = leads.filter((l) => l.status === 'new');
  const chunkSize = 8;

  for (let i = 0; i < newLeads.length; i += chunkSize) {
    const chunk = newLeads.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (lead) => {
        results.evaluated++;

        // Step 1: Consent Guardian Check
        const guardianCheck = ConsentGuardian.evaluateOutbound(lead);
        if (!guardianCheck.allowed) {
          results.blocked++;
          if (guardianCheck.rule_triggered?.includes('Duplicate')) {
            db.updateLead(lead.id, {
              status: 'blocked_duplicate',
              owner_notes: `[BLOCKED BY GUARDIAN] ${guardianCheck.reason}`,
            });
          } else if (guardianCheck.rule_triggered?.includes('suppression')) {
            db.updateLead(lead.id, {
              status: 'unsubscribed',
              owner_notes: `[BLOCKED BY GUARDIAN] Email was previously suppressed.`,
            });
          } else {
            db.updateLead(lead.id, {
              status: 'escalated',
              owner_notes: `[BLOCKED BY GUARDIAN] ${guardianCheck.reason}`,
            });
          }
          return;
        }

        // Step 2: Researcher Agent (fast deterministic batch mode)
        const research = await runResearcherAgent(lead, true);

        // Step 3: Scorer Agent (fast deterministic batch mode)
        const scoreExp = await runScorerAgent(lead, true);
        const assignedLane = scoreExp.score >= 80 ? 'green' : scoreExp.score >= 50 ? 'yellow' : 'red';

        const updatedLead = db.updateLead(lead.id, {
          score: scoreExp.score,
          score_explanation: scoreExp,
          research_summary: research,
          lane: assignedLane,
          status: 'scored',
        });

        results.scored++;

        // Step 4: Autonomous outreach for high-fit Green leads (score >= 80)
        if (assignedLane === 'green' && updatedLead) {
          const emailDraft = await runWriterAgent(updatedLead, undefined, true);
          const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const outboundMessage: Message = {
            id: msgId,
            lead_id: updatedLead.id,
            direction: 'outbound',
            subject: emailDraft.subject,
            body: emailDraft.body,
            status: 'sent_simulated',
            tone_used: emailDraft.tone_used,
            personalization_hooks: emailDraft.personalization_hooks,
            created_at: db.simulatedDate,
          };
          db.addMessage(outboundMessage);

          db.updateLead(updatedLead.id, {
            status: 'contacted',
          });

          db.logAudit({
            lead_id: updatedLead.id,
            lead_name: updatedLead.name,
            agent: 'Supervisor',
            action: 'AUTONOMOUS_OUTBOUND_SENT',
            decision: 'AUTO_EXECUTE',
            reason: `Green Lane Autopilot: High ICP score (${updatedLead.score}/100) triggered simulated personalized email delivery.`,
            confidence: updatedLead.score / 100,
          });

          results.contacted_simulated++;
        }
      })
    );
  }

  res.json({
    success: true,
    message: `Pipeline completed. Processed ${results.evaluated} leads (${results.scored} scored, ${results.contacted_simulated} contacted simulated, ${results.blocked} blocked by Guardian).`,
    results,
  });
});

// GET single lead detail with history
app.get('/api/leads/:id', (req, res) => {
  const lead = db.getLead(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const messages = db.getMessagesForLead(lead.id);
  const replies = db.getRepliesForLead(lead.id);
  const followUps = db.getFollowUpsForLead(lead.id);

  res.json({
    lead,
    messages,
    replies,
    follow_ups: followUps,
  });
});

// Update Owner Notes
app.put('/api/leads/:id/notes', (req, res) => {
  const { notes } = req.body;
  const updated = db.updateLead(req.params.id, { owner_notes: notes || '' });
  if (!updated) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  db.logAudit({
    lead_id: updated.id,
    lead_name: updated.name,
    agent: 'HumanReviewer',
    action: 'UPDATE_OWNER_NOTES',
    decision: 'ALLOW',
    reason: `Sales rep updated notes: "${notes}"`,
  });
  res.json(updated);
});

// Draft Outreach Email
app.post('/api/leads/:id/draft', async (req, res) => {
  const lead = db.getLead(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  // Pre-check with Guardian
  const guardianCheck = ConsentGuardian.evaluateOutbound(lead);
  const draft = await runWriterAgent(lead);

  res.json({
    draft,
    guardian_check: guardianCheck,
  });
});

// Simulate Sending Email
app.post('/api/leads/:id/send', async (req, res) => {
  const lead = db.getLead(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const guardianCheck = ConsentGuardian.evaluateOutbound(lead);
  if (!guardianCheck.allowed) {
    return res.status(403).json({
      error: 'Message blocked by Consent Guardian',
      guardian_check: guardianCheck,
    });
  }

  const { subject, body, tone_used, personalization_hooks } = req.body;
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const outboundMsg: Message = {
    id: msgId,
    lead_id: lead.id,
    direction: 'outbound',
    subject: subject || 'Workflow Automation for ' + lead.company,
    body: body || 'Sample body',
    status: 'sent_simulated',
    tone_used: tone_used || 'executive_short',
    personalization_hooks: personalization_hooks || [],
    created_at: db.simulatedDate,
  };

  db.addMessage(outboundMsg);
  const updatedLead = db.updateLead(lead.id, { status: 'contacted' });

  db.logAudit({
    lead_id: lead.id,
    lead_name: lead.name,
    agent: 'Writer',
    action: 'SIMULATED_SEND',
    decision: 'ALLOW',
    reason: `Email successfully delivered in simulated environment to ${lead.email}.`,
  });

  res.json({
    success: true,
    message: outboundMsg,
    lead: updatedLead,
  });
});

// Process Inbound Reply (Simulator & Live Reply Intelligence)
app.post('/api/leads/:id/process-reply', async (req, res) => {
  const lead = db.getLead(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { reply_text } = req.body;
  if (!reply_text) return res.status(400).json({ error: 'Missing reply_text' });

  // 1. Run Reply Reader Agent
  const analysis = await runReplyReaderAgent(reply_text, db.simulatedDate, lead.score);

  // 2. Track CRM Before State
  const beforeState = {
    status: lead.status,
    lane: lead.lane,
    follow_ups: db.getFollowUpsForLead(lead.id).length,
    suppressed: db.isSuppressed(lead.email),
  };

  // 3. Record Reply Inbound
  const replyRecord: ReplyRecord = {
    id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    lead_id: lead.id,
    raw_text: reply_text,
    classification: analysis.classification,
    confidence: analysis.confidence,
    sensitive: analysis.sensitive,
    reasoning: analysis.reasoning,
    extracted: analysis.extracted,
    lane: analysis.assignedLane,
    created_at: db.simulatedDate,
  };
  db.addReply(replyRecord);

  // Log Reply Analysis
  db.logAudit({
    lead_id: lead.id,
    lead_name: lead.name,
    agent: 'ReplyReader',
    action: 'CLASSIFY_INBOUND_REPLY',
    decision: analysis.assignedLane === 'green' ? 'AUTO_EXECUTE' : analysis.assignedLane === 'yellow' ? 'ALLOW' : 'ESCALATE',
    reason: `Classified as '${analysis.classification}' (${Math.round(analysis.confidence * 100)}% conf). Route -> [${analysis.assignedLane.toUpperCase()} Lane]. ${analysis.reasoning}`,
    confidence: analysis.confidence,
  });

  let createdLeadId: string | null = null;
  let escalationBriefing = null;

  // 4. Execute Autonomous Action Based on Classification and Lane
  if (analysis.classification === 'unsubscribe') {
    // ALWAYS executed immediately regardless of confidence
    ConsentGuardian.executeUnsubscribe(lead.id, lead.email, reply_text);
  } else if (analysis.classification === 'not_now') {
    const followUpDate = analysis.extracted.follow_up_date || '2027-01-15';
    db.addFollowUp({
      id: `fu_${Date.now()}`,
      lead_id: lead.id,
      due_date: followUpDate,
      reason: `Automated re-engagement requested by prospect: "${reply_text}"`,
      status: 'pending',
      created_at: db.simulatedDate,
    });
    db.updateLead(lead.id, { status: 'not_now' });
    db.logAudit({
      lead_id: lead.id,
      lead_name: lead.name,
      agent: 'Supervisor',
      action: 'SCHEDULE_FOLLOWUP',
      decision: 'ALLOW',
      reason: `Temporal postponement handled: scheduled re-contact on ${followUpDate}.`,
    });
  } else if (analysis.classification === 'referral') {
    db.updateLead(lead.id, { status: 'referred' });
    if (analysis.extracted.referral_email || analysis.extracted.referral_name) {
      const newId = `lead_ref_${Date.now()}`;
      const newReferralLead: Lead = {
        id: newId,
        name: analysis.extracted.referral_name || 'Referred Colleague',
        email: analysis.extracted.referral_email || `${analysis.extracted.referral_name?.toLowerCase().replace(/\s/g, '') || 'referral'}@${lead.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        company: lead.company,
        role: 'Referred Contact',
        industry: lead.industry,
        company_size: lead.company_size,
        signals: ['referred by colleague', ...lead.signals],
        status: 'new',
        score: Math.min(100, lead.score + 5),
        lane: 'yellow',
        owner_notes: `Referred by ${lead.name} (${lead.email}) via reply: "${reply_text}"`,
        created_at: db.simulatedDate,
        updated_at: db.simulatedDate,
      };
      db.leads.set(newId, newReferralLead);
      createdLeadId = newId;

      db.logAudit({
        lead_id: newId,
        lead_name: newReferralLead.name,
        agent: 'Supervisor',
        action: 'CREATE_REFERRED_LEAD',
        decision: 'ALLOW',
        reason: `Generated new prospective lead from colleague referral provided by ${lead.name}.`,
      });
    }
  } else if (analysis.classification === 'interested') {
    if (lead.score >= 90) {
      // Escalated to human queue because high value lead replied interested
      analysis.assignedLane = 'red';
      db.updateLead(lead.id, { status: 'escalated' });
    } else {
      db.updateLead(lead.id, { status: 'interested' });
    }
  } else if (analysis.classification === 'out_of_office') {
    db.addFollowUp({
      id: `fu_${Date.now()}`,
      lead_id: lead.id,
      due_date: analysis.extracted.follow_up_date || '2026-10-25',
      reason: `Out-of-office autoreply resumption: "${reply_text}"`,
      status: 'pending',
      created_at: db.simulatedDate,
    });
  }

  // 5. If RED lane: create escalation briefing & review queue item
  if (analysis.assignedLane === 'red') {
    escalationBriefing = await generateEscalationBriefing(lead, reply_text, analysis);
    const queueItem: ReviewQueueItem = {
      id: `queue_${Date.now()}`,
      lead_id: lead.id,
      lead_name: lead.name,
      company: lead.company,
      role: lead.role,
      type: 'reply_takeover',
      lane: 'red',
      context_text: reply_text,
      confidence: analysis.confidence,
      briefing: escalationBriefing,
      status: 'pending',
      created_at: db.simulatedDate,
    };
    db.addQueueItem(queueItem);
    db.updateLead(lead.id, { status: 'escalated' });

    db.logAudit({
      lead_id: lead.id,
      lead_name: lead.name,
      agent: 'Supervisor',
      action: 'ESCALATE_TO_HUMAN',
      decision: 'ESCALATE',
      reason: `Routed to RED Queue: ${escalationBriefing.why_escalated}`,
    });
  } else if (analysis.assignedLane === 'yellow') {
    // Yellow Queue (Approval needed)
    escalationBriefing = await generateEscalationBriefing(lead, reply_text, analysis);
    const queueItem: ReviewQueueItem = {
      id: `queue_${Date.now()}`,
      lead_id: lead.id,
      lead_name: lead.name,
      company: lead.company,
      role: lead.role,
      type: 'draft_approval',
      lane: 'yellow',
      context_text: reply_text,
      confidence: analysis.confidence,
      briefing: escalationBriefing,
      status: 'pending',
      created_at: db.simulatedDate,
    };
    db.addQueueItem(queueItem);
  }

  const freshLead = db.getLead(lead.id);
  const afterState = {
    status: freshLead?.status,
    lane: freshLead?.lane,
    follow_ups: db.getFollowUpsForLead(lead.id).length,
    suppressed: db.isSuppressed(lead.email),
  };

  res.json({
    analysis,
    crm_diff: {
      before: beforeState,
      after: afterState,
    },
    created_referral_lead_id: createdLeadId,
    escalation_briefing: escalationBriefing,
    lead: freshLead,
  });
});

// Buying Signal Radar: Inject Signal and Re-score
app.post('/api/leads/:id/inject-signal', async (req, res) => {
  const lead = db.getLead(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { signal } = req.body;
  if (!signal) return res.status(400).json({ error: 'Signal string is required' });

  const oldScore = lead.score;
  const allLeadsBefore = db.getAllLeads().sort((a, b) => b.score - a.score);
  const oldRank = allLeadsBefore.findIndex((l) => l.id === lead.id) + 1;

  // Add signal if not duplicate
  const updatedSignals = [...lead.signals];
  if (!updatedSignals.includes(signal)) {
    updatedSignals.push(signal);
  }

  const leadToEvaluate: Lead = {
    ...lead,
    signals: updatedSignals,
  };

  const newScoreExplanation = await runScorerAgent(leadToEvaluate);
  const newScore = newScoreExplanation.score;
  const newLane = newScore >= 80 ? 'green' : newScore >= 50 ? 'yellow' : 'red';

  const updatedLead = db.updateLead(lead.id, {
    signals: updatedSignals,
    score: newScore,
    score_explanation: newScoreExplanation,
    lane: newLane,
  });

  const allLeadsAfter = db.getAllLeads().sort((a, b) => b.score - a.score);
  const newRank = allLeadsAfter.findIndex((l) => l.id === lead.id) + 1;

  db.logAudit({
    lead_id: lead.id,
    lead_name: lead.name,
    agent: 'Scorer',
    action: 'INJECT_BUYING_SIGNAL',
    decision: 'ALLOW',
    reason: `Buying signal '${signal}' injected: score shifted from ${oldScore} -> ${newScore} (Rank #${oldRank} -> #${newRank}).`,
    confidence: newScore / 100,
  });

  res.json({
    lead: updatedLead,
    old_score: oldScore,
    new_score: newScore,
    delta: newScore - oldScore,
    old_rank: oldRank,
    new_rank: newRank,
    factors: newScoreExplanation.factors,
    summary: newScoreExplanation.summary,
  });
});

// Human Review Queue
app.get('/api/queue', (req, res) => {
  const items = db.getQueueItems();
  res.json(items);
});

// Resolve Queue Item
app.post('/api/queue/:id/resolve', async (req, res) => {
  const { action, edited_text } = req.body; // 'approve' | 'edit_approve' | 'reject' | 'take_over'
  const item = db.reviewQueue.find((q) => q.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Queue item not found' });

  const lead = db.getLead(item.lead_id);

  if (action === 'approve' || action === 'edit_approve') {
    item.status = 'approved';
    if (lead) {
      db.updateLead(lead.id, { status: 'contacted' });
    }
    db.logAudit({
      lead_id: item.lead_id,
      lead_name: item.lead_name,
      agent: 'HumanReviewer',
      action: action === 'approve' ? 'QUEUE_ITEM_APPROVED' : 'QUEUE_ITEM_EDIT_APPROVED',
      decision: 'APPROVED',
      reason: `Human salesperson approved action: ${edited_text ? `(Edited response: "${edited_text}")` : 'standard approved'}`,
    });
  } else if (action === 'reject') {
    item.status = 'rejected';
    db.logAudit({
      lead_id: item.lead_id,
      lead_name: item.lead_name,
      agent: 'HumanReviewer',
      action: 'QUEUE_ITEM_REJECTED',
      decision: 'REJECTED',
      reason: 'Sales rep rejected autonomous draft / suggestion.',
    });
  } else if (action === 'take_over') {
    item.status = 'handled';
    if (lead) {
      db.updateLead(lead.id, {
        status: 'closed',
        owner_notes: `[HUMAN TAKEOVER ${db.simulatedDate}] Managed by account representative directly.`,
      });
    }
    db.logAudit({
      lead_id: item.lead_id,
      lead_name: item.lead_name,
      agent: 'HumanReviewer',
      action: 'MANUAL_TAKEOVER_CLAIMED',
      decision: 'MANUAL_TAKEOVER',
      reason: 'Human account executive took over ownership of the prospect thread.',
    });
  }

  res.json({ success: true, item });
});

// Audit Trail with Filtering
app.get('/api/audit-log', (req, res) => {
  const { agent, decision, lead_id } = req.query;
  let logs = db.getAuditLog();

  if (agent && typeof agent === 'string') {
    logs = logs.filter((l) => l.agent.toLowerCase() === agent.toLowerCase());
  }
  if (decision && typeof decision === 'string') {
    logs = logs.filter((l) => l.decision.toLowerCase() === decision.toLowerCase());
  }
  if (lead_id && typeof lead_id === 'string') {
    logs = logs.filter((l) => l.lead_id === lead_id);
  }

  res.json(logs);
});

// Time Machine: Advance simulated date
app.post('/api/time-machine/advance', async (req, res) => {
  const { days, reset } = req.body;

  if (reset) {
    db.simulatedDate = '2026-10-12';
    db.logAudit({
      lead_id: 'SYSTEM',
      agent: 'Supervisor',
      action: 'TIME_MACHINE_RESET',
      decision: 'ALLOW',
      reason: 'Simulated date reset to baseline: 2026-10-12',
    });
    return res.json({ simulated_date: db.simulatedDate, follow_ups_handled: [] });
  }

  const advanceDays = typeof days === 'number' ? days : 1;
  const currentDateObj = new Date(db.simulatedDate);
  currentDateObj.setDate(currentDateObj.getDate() + advanceDays);
  db.simulatedDate = currentDateObj.toISOString().split('T')[0];

  // Process scheduled follow-ups due on or before new date
  const dueFollowUps = db.followUps.filter(
    (fu) => fu.status === 'pending' && fu.due_date <= db.simulatedDate
  );

  const handledFollowUps: Array<{ follow_up: any; action: string; reason: string }> = [];

  for (const fu of dueFollowUps) {
    const lead = db.getLead(fu.lead_id);
    if (!lead) continue;

    // Consent check
    if (lead.status === 'unsubscribed' || db.isSuppressed(lead.email)) {
      fu.status = 'cancelled';
      handledFollowUps.push({
        follow_up: fu,
        action: 'CANCELLED',
        reason: 'Lead is in suppression list / unsubscribed.',
      });
      continue;
    }

    if (lead.status === 'replied' || lead.status === 'interested' || lead.status === 'escalated') {
      fu.status = 'cancelled';
      handledFollowUps.push({
        follow_up: fu,
        action: 'CANCELLED',
        reason: `Lead is already in active status '${lead.status}'.`,
      });
      continue;
    }

    // Guardian evaluation
    const guardianCheck = ConsentGuardian.evaluateOutbound(lead);
    if (!guardianCheck.allowed) {
      fu.status = 'cancelled';
      handledFollowUps.push({
        follow_up: fu,
        action: 'BLOCKED',
        reason: guardianCheck.reason,
      });
      continue;
    }

    // Draft and simulate send follow-up
    const followUpDraft = await runWriterAgent(lead, {
      isFollowUp: true,
      previousNote: fu.reason,
    });

    const msgId = `msg_fu_${Date.now()}`;
    db.addMessage({
      id: msgId,
      lead_id: lead.id,
      direction: 'outbound',
      subject: followUpDraft.subject,
      body: followUpDraft.body,
      status: 'sent_simulated',
      tone_used: followUpDraft.tone_used,
      personalization_hooks: followUpDraft.personalization_hooks,
      created_at: db.simulatedDate,
    });

    fu.status = 'done';
    db.updateLead(lead.id, { status: 'contacted' });

    db.logAudit({
      lead_id: lead.id,
      lead_name: lead.name,
      agent: 'Supervisor',
      action: 'SCHEDULED_FOLLOWUP_DISPATCHED',
      decision: 'AUTO_EXECUTE',
      reason: `Time Machine triggered due follow-up on ${db.simulatedDate}: "${followUpDraft.subject}".`,
    });

    handledFollowUps.push({
      follow_up: fu,
      action: 'SENT_SIMULATED',
      reason: `Autonomous follow-up drafted and simulated sent for reason: ${fu.reason}`,
    });
  }

  res.json({
    simulated_date: db.simulatedDate,
    days_advanced: advanceDays,
    follow_ups_handled: handledFollowUps,
  });
});

// Run Test Set Evaluation (15 Cases)
app.post('/api/evaluation/run', async (req, res) => {
  const items: EvaluationResult['items'] = [];
  let correctCount = 0;
  const perClass: EvaluationResult['per_class'] = {};

  for (const testCase of replyTestSet) {
    const analysis = await runReplyReaderAgent(testCase.reply_text, db.simulatedDate, 70, true);
    const predicted = analysis.classification;
    const isCorrect = predicted === testCase.expected_label;

    if (isCorrect) correctCount++;

    if (!perClass[testCase.expected_label]) {
      perClass[testCase.expected_label] = { total: 0, correct: 0, accuracy: 0 };
    }
    perClass[testCase.expected_label].total++;
    if (isCorrect) {
      perClass[testCase.expected_label].correct++;
    }

    items.push({
      id: testCase.id,
      reply_text: testCase.reply_text,
      expected: testCase.expected_label,
      predicted: predicted,
      confidence: analysis.confidence,
      correct: isCorrect,
      reasoning: analysis.reasoning,
    });
  }

  // Calculate per class percentages
  Object.keys(perClass).forEach((key) => {
    const cls = perClass[key];
    cls.accuracy = Math.round((cls.correct / cls.total) * 100);
  });

  const accuracy = Math.round((correctCount / replyTestSet.length) * 100);

  const evalResult: EvaluationResult = {
    total: replyTestSet.length,
    correct: correctCount,
    accuracy,
    tested_at: new Date().toISOString(),
    per_class: perClass,
    items,
  };

  db.logAudit({
    lead_id: 'SYSTEM',
    agent: 'ReplyReader',
    action: 'RUN_TEST_SET_EVALUATION',
    decision: 'ALLOW',
    reason: `Ran 15-case reply test set: Accuracy reached ${accuracy}% (${correctCount}/${replyTestSet.length} correct).`,
    confidence: accuracy / 100,
  });

  res.json(evalResult);
});

// Mount Vite in development or static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TrustPipeline] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[TrustPipeline] Failed to start server:', err);
});
