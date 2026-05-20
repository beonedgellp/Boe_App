import { apiRequest, delay, useHttpApi } from './_util.js';

const FIXTURE_KYC = {
  id: 'fixture-kyc-1',
  userId: 'fixture-user-1',
  panLast4: null,
  aadhaarLast4: null,
  addressJson: {},
  documentRefsJson: [],
  fatcaStatus: 'not_started',
  fatcaDeclaration: null,
  nominees: [],
  reKycDueDate: null,
  reKycTriggerReason: null,
  reviewStatus: 'not_started',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function fetchKycStatus() {
  if (useHttpApi()) return apiRequest('/v1/client/kyc-status', { method: 'GET' });
  await delay(180);
  return { ...FIXTURE_KYC };
}

export async function updateKycDepth(payload) {
  if (useHttpApi()) return apiRequest('/v1/client/kyc-depth', { method: 'POST', body: payload });
  await delay(280);
  return { ...FIXTURE_KYC, ...payload, updatedAt: new Date().toISOString() };
}
