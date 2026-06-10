import { HttpError } from '#http/errors.js';
import { readJsonStore } from '#db/pgAdapter.js';

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function getHolding(config, actor, fundId) {
  const store = await readJsonStore(config);
  const portfolio = store[`portfolio_${actor.userId}`] || { holdings: [] };
  const holding = (portfolio.holdings || []).find((h) => h.fundId === fundId);

  if (!holding) {
    throw new HttpError(404, 'HOLDING_NOT_FOUND', 'Holding not found.');
  }

  const invested = toNumber(holding.units) * toNumber(holding.avgCost || 0);

  return {
    fundId: holding.fundId,
    fundName: holding.fundName,
    units: holding.units,
    invested,
    status: holding.status,
  };
}
