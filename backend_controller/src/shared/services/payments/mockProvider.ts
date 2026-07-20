import { randomUUID } from 'node:crypto';

export function createMockProvider() {
  return {
    name: 'mock',
    async createPaymentOrder({ amount, currency, receipt, notes }: any) {
      return {
        id: `mock_order_${randomUUID()}`,
        amount,
        currency,
        status: 'created',
        receipt: receipt || '',
        notes: notes || {},
      };
    },
    async createMandate({ amount, frequency, customerId, notes }: any) {
      return {
        id: `mock_mandate_${randomUUID()}`,
        status: 'created',
        amount,
        frequency,
        customer_id: customerId,
        notes: notes || {},
      };
    },
    async fetchPayment(paymentId: any) {
      return {
        id: paymentId,
        status: 'captured',
        amount: 0,
        currency: 'INR',
      };
    },
    async fetchMandate(mandateId: any) {
      return {
        id: mandateId,
        status: 'active',
        amount: 0,
        frequency: 'monthly',
      };
    },
    async verifyWebhookSignature(body: any, signature: any, secret: any) {
      return true;
    },
  };
}
