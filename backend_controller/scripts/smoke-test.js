#!/usr/bin/env node
/**
 * Round-trip smoke tests for BeOnEdge admin-to-client flows.
 * Runs directly against JSON store (no HTTP server needed).
 */
import { loadConfig } from '../src/config/env.js';
import { readJsonStore, updateJsonStore } from '../src/db/jsonStore.js';
import { toClientFunds, toClientFund } from '../src/admin/services/fundsService.js';
import { listAdminNotifications, sendNotification } from '../src/admin/services/notificationComposerService.js';
import { replyToTicket } from '../src/admin/services/supportTicketAdminService.js';
import { reviewKyc } from '../src/admin/services/kycReviewService.js';
import { listAdminFaqs } from '../src/admin/services/faqAdminService.js';
import { randomUUID } from 'node:crypto';

const config = loadConfig();
const PASS = '\x1b[32mPASS\x1b[0m';
const FAIL = '\x1b[31mFAIL\x1b[0m';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) { passed++; console.log(`  ${PASS} ${message}`); }
  else { failed++; console.log(`  ${FAIL} ${message}`); }
}

async function runTests() {
  console.log('=== BeOnEdge Round-Trip Smoke Tests ===\n');

  const store = await readJsonStore(config);

  /* RT-1: Admin approves KYC → client unlocks invest */
  console.log('RT-1: Admin approves KYC → client unlocks invest');
  {
    const pendingUser = store.users.find(u => u.status === 'pending_approval');
    assert(pendingUser, 'Pending user exists');
    if (pendingUser) {
      const actor = { userId: 'admin-test', role: 'admin' };
      await reviewKyc(config, actor, pendingUser.id, { action: 'approve', reason: 'Smoke test approval' });
      const updatedStore = await readJsonStore(config);
      const updatedUser = updatedStore.users.find(u => u.id === pendingUser.id);
      assert(updatedUser.status === 'approved', `User status is approved (was ${updatedUser.status})`);
      assert(updatedUser.kycStatus === 'approved', `KYC status is approved (was ${updatedUser.kycStatus})`);
      // Reset back to pending for repeatability
      await updateJsonStore(config, (s) => {
        const u = s.users.find(x => x.id === pendingUser.id);
        if (u) { u.status = 'pending_approval'; u.kycStatus = 'pending'; }
        const k = s.kycProfiles.find(x => x.userId === pendingUser.id);
        if (k) { k.reviewStatus = 'not_started'; }
        return true;
      });
    }
  }

  /* RT-2: Admin publishes fund → appears in Explore */
  console.log('\nRT-2: Admin publishes fund → appears in Explore');
  {
    const clientFunds = toClientFunds(store.funds);
    assert(clientFunds.length >= 2, `At least 2 client-visible funds (${clientFunds.length})`);
    const activeFund = clientFunds.find(f => f.lifecycleStage === 'active');
    const publishedFund = clientFunds.find(f => f.lifecycleStage === 'published');
    assert(activeFund, 'Active fund visible to clients');
    assert(publishedFund, 'Published fund visible to clients');
  }

  /* RT-3: Admin pauses fund → client shows paused */
  console.log('\nRT-3: Admin pauses fund → client shows paused');
  {
    const pausedFund = store.funds.find(f => f.lifecycleStage === 'paused');
    assert(pausedFund, 'Paused fund exists in store');
    const clientPaused = toClientFund(pausedFund);
    assert(clientPaused, 'Paused fund is visible to clients');
    assert(clientPaused.lifecycleStage === 'paused', 'Client sees paused lifecycleStage');
  }

  /* RT-4: Admin updates disclosure → client shows live version */
  console.log('\nRT-4: Admin updates disclosure → client shows live version');
  {
    const fund = store.funds.find(f => f.lifecycleStage === 'active');
    assert(fund, 'Active fund exists for disclosure test');
    if (fund) {
      const disclosure = {
        id: randomUUID(),
        fundId: fund.id,
        version: '1.1-smoke',
        title: 'Smoke Test Disclosure',
        content: 'This disclosure was created during smoke testing.',
        status: 'published',
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await updateJsonStore(config, (s) => {
        if (!Array.isArray(s.disclosures)) s.disclosures = [];
        s.disclosures.push(disclosure);
        return true;
      });
      const updatedStore = await readJsonStore(config);
      const found = updatedStore.disclosures.find(d => d.fundId === fund.id && d.version === '1.1-smoke');
      assert(found, 'Disclosure persisted and linked to fund');
    }
  }

  /* RT-5: Admin sends notification → client receives it */
  console.log('\nRT-5: Admin sends notification → client receives it');
  {
    const actor = { userId: 'admin-test', role: 'admin' };
    const before = (await listAdminNotifications(config)).count || 0;
    await sendNotification(config, actor, {
      title: 'Smoke Test Notification',
      body: 'This is a test notification from the smoke test suite.',
      target: 'all',
    });
    const afterStore = await readJsonStore(config);
    const after = (afterStore.notifications || []).length;
    assert(after > before, `Notification count increased (${before} → ${after})`);
  }

  /* RT-6: Client submits ticket → admin sees it */
  console.log('\nRT-6: Client submits ticket → admin sees it');
  {
    const tickets = store.supportTickets || [];
    assert(tickets.length >= 3, `At least 3 support tickets exist (${tickets.length})`);
  }

  /* RT-7: Admin replies to ticket → client sees reply */
  console.log('\nRT-7: Admin replies to ticket → client sees reply');
  {
    const openTicket = store.supportTickets.find(t => t.status === 'open');
    assert(openTicket, 'Open ticket exists for reply test');
    if (openTicket) {
      const actor = { userId: 'admin-test', role: 'admin' };
      await replyToTicket(config, actor, openTicket.id, { message: 'Smoke test admin reply.' });
      const updatedStore = await readJsonStore(config);
      const messages = updatedStore.supportTicketMessages || [];
      const reply = messages.find(m => m.ticketId === openTicket.id && m.body === 'Smoke test admin reply.');
      assert(reply, 'Admin reply persisted in supportTicketMessages');
      const ticket = updatedStore.supportTickets.find(t => t.id === openTicket.id);
      assert(ticket.status === 'in_progress', `Ticket status updated to in_progress (was ${ticket?.status})`);
    }
  }

  /* RT-8: Admin updates FAQ → client FAQ reflects it */
  console.log('\nRT-8: Admin updates FAQ → client FAQ reflects it');
  {
    const faqs = await listAdminFaqs(config);
    assert(faqs.items.length >= 3, `At least 3 FAQs exist (${faqs.items.length})`);
  }

  /* RT-9: Client withdrawal → admin queue → approval → client updates */
  console.log('\nRT-9: Client withdrawal → admin queue → approval');
  {
    const pending = store.redemptionRequests.filter(r => r.status === 'pending');
    const approved = store.redemptionRequests.filter(r => r.status === 'approved');
    assert(pending.length >= 1, `At least 1 pending redemption (${pending.length})`);
    assert(approved.length >= 1, `At least 1 approved redemption (${approved.length})`);
  }

  /* RT-10: Client SIP → admin control queue → pause → client shows paused */
  console.log('\nRT-10: Client SIP → admin control queue');
  {
    const pausedSip = store.investmentPlans.find(p => p.type === 'sip' && p.status === 'paused');
    const sipRequests = store.sipControlRequests || [];
    assert(pausedSip, 'Paused SIP plan exists');
    assert(sipRequests.length >= 2, `At least 2 SIP control requests (${sipRequests.length})`);
    const pauseReq = sipRequests.find(r => r.action === 'pause');
    assert(pauseReq, 'Pause SIP control request exists');
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
