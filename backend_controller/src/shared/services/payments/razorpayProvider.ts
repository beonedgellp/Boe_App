import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'node:crypto';

export function createRazorpayProvider(config: AppConfig) {
  const keyId = config.razorpayKeyId;
  const keySecret = config.razorpayKeySecret;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay key ID and secret are required.');
  }

  const client = new Razorpay({ key_id: keyId, key_secret: keySecret });

  return {
    name: 'razorpay',
    client,

    async createPaymentOrder({ amount, currency = 'INR', receipt, notes }: any) {
      const order = await client.orders.create({
        amount: Math.round(amount * 100), // paise
        currency,
        receipt: receipt || undefined,
        notes: notes || undefined,
      });
      return {
        id: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        status: order.status,
        receipt: order.receipt,
        notes: order.notes,
      };
    },

    async createMandate({ amount, frequency, customerId, notes }: any) {
      // Razorpay mandates are created via customer + token APIs
      // For test mode, we simulate the token creation
      const token = await client.tokens.create({
        customer_id: customerId,
        method: 'upi',
        notes: notes || undefined,
      });
      return {
        id: token.id,
        status: token.status || 'active',
        amount,
        frequency,
        customer_id: customerId,
        notes: token.notes || {},
      };
    },

    async fetchPayment(paymentId: any) {
      const payment = await client.payments.fetch(paymentId);
      return {
        id: payment.id,
        status: payment.status,
        amount: payment.amount / 100,
        currency: payment.currency,
        order_id: payment.order_id,
        method: payment.method,
      };
    },

    async fetchMandate(mandateId: any) {
      const token = await client.tokens.fetch(mandateId);
      return {
        id: token.id,
        status: token.status || 'active',
        amount: token.max_amount ? token.max_amount / 100 : 0,
        frequency: token.frequency || 'monthly',
        customer_id: token.customer_id,
      };
    },

    async verifyWebhookSignature(body: any, signature: any, secret: any) {
      const expected = createHmac('sha256', secret || keySecret)
        .update(body)
        .digest('hex');
      const sig = String(signature || '').trim();
      if (sig.length !== expected.length) return false;
      try {
        return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
      } catch {
        return false;
      }
    },
  };
}
