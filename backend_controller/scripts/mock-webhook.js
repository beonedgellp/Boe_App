#!/usr/bin/env node
/**
 * Mock webhook helper for end-to-end testing.
 * Usage: node scripts/mock-webhook.js --payment <payment_id> --status success|failed
 *        node scripts/mock-webhook.js --mandate <mandate_id> --status active|failed
 */
import { loadConfig } from '../src/config/env.js';
import { readJsonStore } from '../src/db/jsonStore.js';
import { processPaymentWebhook, processMandateWebhook } from '../src/shared/services/webhookService.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    result[key] = args[i + 1];
  }
  return result;
}

const args = parseArgs();
const config = loadConfig();

async function main() {
  if (args.payment) {
    const store = await readJsonStore(config);
    const payment = (store.payments || []).find((p) => p.id === args.payment);
    if (!payment) {
      console.error(`Payment ${args.payment} not found.`);
      process.exit(1);
    }
    const body = {
      eventId: `mock_${payment.id}_${Date.now()}`,
      providerRef: payment.providerPaymentId || payment.id,
      status: args.status || 'success',
      timestamp: Date.now(),
    };
    const result = await processPaymentWebhook(config, 'mock', body, {});
    console.log('Payment webhook result:', result);
  } else if (args.mandate) {
    const store = await readJsonStore(config);
    const mandate = (store.mandates || []).find((m) => m.id === args.mandate);
    if (!mandate) {
      console.error(`Mandate ${args.mandate} not found.`);
      process.exit(1);
    }
    const body = {
      eventId: `mock_${mandate.id}_${Date.now()}`,
      providerRef: mandate.providerMandateId || mandate.id,
      status: args.status || 'active',
      timestamp: Date.now(),
    };
    const result = await processMandateWebhook(config, 'mock', body, {});
    console.log('Mandate webhook result:', result);
  } else {
    console.log(`Usage:
  node scripts/mock-webhook.js --payment <payment_id> --status success
  node scripts/mock-webhook.js --payment <payment_id> --status failed
  node scripts/mock-webhook.js --mandate <mandate_id> --status active
  node scripts/mock-webhook.js --mandate <mandate_id> --status failed
`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
