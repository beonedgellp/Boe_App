import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import type { HoldingItem } from '#types/models.js';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';

function toNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function getHolding(config: AppConfig, actor: Actor, fundId: string) {
  const snapshot = await prisma.portfolioSnapshot.findFirst({
    where: { userId: actor.userId },
    orderBy: { asOfDate: 'desc' },
  });

  const payload = (snapshot?.payload as any) || { holdings: [] };
  const holdings: HoldingItem[] = payload.holdings || [];
  const holding = holdings.find((h: HoldingItem) => h.fundId === fundId);

  if (!holding) {
    throw new HttpError(404, 'HOLDING_NOT_FOUND', 'Holding not found.');
  }

  const invested = toNumber(holding.units) * toNumber(holding.avgCost || 0);

  return {
    fundId: holding.fundId,
    fundName: holding.name,
    units: holding.units,
    invested,
    status: holding.status,
  };
}
