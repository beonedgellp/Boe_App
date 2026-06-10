import { plans, type Plan } from '../content/plans';

export type { Plan } from '../content/plans';

export function formatPrice(pricePaise: number): string {
  const rupees = Math.round(pricePaise / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export async function fetchPlans(): Promise<Plan[]> {
  // In the future this can become a real API call.
  return Promise.resolve([...plans]);
}
