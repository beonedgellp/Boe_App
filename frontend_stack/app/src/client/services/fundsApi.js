import { apiRequest, clone, delay, listFromPayload, useHttpApi } from './_util.js';
import { loadAppConfig, strategyById } from '../../shared/appConfig.js';

export async function listFunds() {
  if (useHttpApi()) {
    try {
      return listFromPayload(await apiRequest('/v1/products'));
    } catch (error) {
      if (error?.code !== 'USER_NOT_APPROVED') throw error;
      return clone(loadAppConfig().mobile.products);
    }
  }

  await delay();
  return clone(loadAppConfig().mobile.products);
}

export async function getFund(fundId) {
  if (useHttpApi()) {
    try {
      return await apiRequest(`/v1/products/${encodeURIComponent(fundId)}`);
    } catch (error) {
      if (error?.code !== 'USER_NOT_APPROVED') throw error;
      return clone(strategyById(loadAppConfig(), fundId));
    }
  }

  await delay();
  return clone(strategyById(loadAppConfig(), fundId));
}

export async function previewWithdrawal(holdingId, amount, previewDate) {
  if (useHttpApi()) {
    const dateParam = previewDate || new Date().toISOString();
    return await apiRequest(`/v1/client/withdrawals/preview?holdingId=${encodeURIComponent(holdingId)}&amount=${encodeURIComponent(amount)}&previewDate=${encodeURIComponent(dateParam)}`);
  }
  await delay(200);
  return {
    id: 'mock-preview',
    holdingId,
    units: amount / 142.35,
    grossAmount: amount,
    exitLoadAmount: 0,
    exitLoadRate: 0,
    exitLoadFormula: '0% — no exit load applicable',
    sttAmount: amount * 0.00001,
    sttRate: 0.00001,
    holdingPeriodMonths: 18,
    gainType: 'LTCG',
    gainAmount: amount * 0.1,
    ltcgExemptionUsed: Math.min(amount * 0.1, 125000),
    ltcgExemptionLimit: 125000,
    taxAmount: Math.max(0, amount * 0.1 - 125000) * 0.125,
    taxRate: 0.125,
    netProceeds: amount - (amount * 0.00001) - (Math.max(0, amount * 0.1 - 125000) * 0.125),
    assumptions: {
      stcgRate: 0.15,
      ltcgRate: 0.125,
      ltcgExemptionLimit: 125000,
      sttRate: 0.00001,
      holdingPeriodCutoffMonths: 12,
      calculationDate: new Date().toISOString(),
    },
  };
}

export async function createWithdrawal(previewId) {
  if (useHttpApi()) {
    return await apiRequest('/v1/client/withdrawals', { method: 'POST', body: { previewId } });
  }
  await delay(200);
  return { id: 'mock-redemption', status: 'pending', previewId };
}

export async function listRedemptionRequests() {
  if (useHttpApi()) {
    return listFromPayload(await apiRequest('/v1/client/redemptions'));
  }
  await delay(200);
  return [];
}
