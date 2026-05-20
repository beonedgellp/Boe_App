import { randomUUID } from 'node:crypto';
import { HttpError } from '../../http/errors.js';
import { jsonStoreEnabled, updateJsonStore, readJsonStore } from '../../db/jsonStore.js';

function normalizeEmail(value) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function computeRiskCategory(answers) {
  if (!answers || typeof answers !== 'object') {
    return 'conservative';
  }

  let hasAggressive = false;
  let hasModerate = false;

  function scan(value) {
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (v === 'aggressive' || v === 'high') {
        hasAggressive = true;
      } else if (v === 'moderate' || v === 'medium') {
        hasModerate = true;
      }
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      if (value >= 4) {
        hasAggressive = true;
      } else if (value === 3) {
        hasModerate = true;
      }
    } else if (Array.isArray(value)) {
      for (const item of value) scan(item);
    } else if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) scan(value[key]);
    }
  }

  scan(answers);

  if (hasAggressive) return 'aggressive';
  if (hasModerate) return 'moderate';
  return 'conservative';
}

export async function submitApplication(config, body) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for onboarding applications is not yet implemented.');
  }

  const { name, email, phone } = body || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new HttpError(400, 'NAME_REQUIRED', 'Name is required.');
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    throw new HttpError(400, 'EMAIL_REQUIRED', 'A valid email is required.');
  }

  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    throw new HttpError(400, 'PHONE_REQUIRED', 'Phone is required.');
  }

  const now = new Date().toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const trimmedPhone = phone.trim();

  const result = await updateJsonStore(config, (store) => {
    if (!Array.isArray(store.onboardingApplications)) store.onboardingApplications = [];

    const existing = store.onboardingApplications.find((app) =>
      app.email === normalizedEmail &&
      app.phone === trimmedPhone &&
      app.createdAt >= twentyFourHoursAgo
    );

    if (existing) {
      return existing;
    }

    const application = {
      id: randomUUID(),
      onboardingSessionId: randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      phone: trimmedPhone,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    };

    store.onboardingApplications.push(application);
    return application;
  });

  return result;
}

export async function submitRiskProfile(config, body) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for risk profiles is not yet implemented.');
  }

  const { email, answers, onboardingSessionId } = body || {};

  if (!onboardingSessionId || typeof onboardingSessionId !== 'string' || onboardingSessionId.trim().length === 0) {
    throw new HttpError(400, 'SESSION_REQUIRED', 'Onboarding session ID is required.');
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    throw new HttpError(400, 'EMAIL_REQUIRED', 'A valid email is required.');
  }

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new HttpError(400, 'ANSWERS_REQUIRED', 'Answers object is required.');
  }

  const store = await readJsonStore(config);
  const sessionApplication = (store.onboardingApplications || []).find(
    (app) => app.onboardingSessionId === onboardingSessionId
  );

  if (!sessionApplication) {
    throw new HttpError(400, 'INVALID_SESSION', 'Onboarding session not found.');
  }
  if (sessionApplication.email !== normalizedEmail) {
    throw new HttpError(400, 'SESSION_EMAIL_MISMATCH', 'Onboarding session does not match the submitted email.');
  }

  const riskCategory = computeRiskCategory(answers);

  const now = new Date().toISOString();
  const profile = {
    id: randomUUID(),
    onboardingSessionId,
    email: normalizedEmail,
    answers,
    riskCategory,
    createdAt: now,
  };

  await updateJsonStore(config, (store) => {
    if (!Array.isArray(store.onboardingRiskProfiles)) store.onboardingRiskProfiles = [];
    store.onboardingRiskProfiles.push(profile);
    return profile;
  });

  return profile;
}

export async function submitKycDocuments(config, body) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for KYC documents is not yet implemented.');
  }

  const { email, documentType, documentRef, onboardingSessionId } = body || {};

  if (!onboardingSessionId || typeof onboardingSessionId !== 'string' || onboardingSessionId.trim().length === 0) {
    throw new HttpError(400, 'SESSION_REQUIRED', 'Onboarding session ID is required.');
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    throw new HttpError(400, 'EMAIL_REQUIRED', 'A valid email is required.');
  }

  if (!documentType || typeof documentType !== 'string' || documentType.trim().length === 0) {
    throw new HttpError(400, 'DOCUMENT_TYPE_REQUIRED', 'Document type is required.');
  }

  if (!documentRef || typeof documentRef !== 'string' || documentRef.trim().length === 0) {
    throw new HttpError(400, 'DOCUMENT_REF_REQUIRED', 'Document reference is required.');
  }

  const store = await readJsonStore(config);
  const sessionApplication = (store.onboardingApplications || []).find(
    (app) => app.onboardingSessionId === onboardingSessionId
  );

  if (!sessionApplication) {
    throw new HttpError(400, 'INVALID_SESSION', 'Onboarding session not found.');
  }
  if (sessionApplication.email !== normalizedEmail) {
    throw new HttpError(400, 'SESSION_EMAIL_MISMATCH', 'Onboarding session does not match the submitted email.');
  }

  const now = new Date().toISOString();
  const document = {
    id: randomUUID(),
    onboardingSessionId,
    email: normalizedEmail,
    documentType: documentType.trim(),
    documentRef: documentRef.trim(),
    status: 'pending_review',
    createdAt: now,
  };

  await updateJsonStore(config, (store) => {
    if (!Array.isArray(store.onboardingKycDocuments)) store.onboardingKycDocuments = [];
    store.onboardingKycDocuments.push(document);
    return document;
  });

  return document;
}
