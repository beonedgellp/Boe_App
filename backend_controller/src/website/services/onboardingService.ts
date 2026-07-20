import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';

function normalizeEmail(value: any) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function isValidEmail(email: any) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function computeRiskCategory(answers: any) {
  if (!answers || typeof answers !== 'object') {
    return 'conservative';
  }

  let hasAggressive = false;
  let hasModerate = false;

  function scan(value: any) {
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


export async function submitApplication(config: AppConfig, body: Record<string, unknown>) {
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

  const now = new Date();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const trimmedPhone = (phone as string).trim();
  const nameParts = (name as string).trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Check for existing recent user with same email+phone
  const existing = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      phone: trimmedPhone,
      createdAt: { gte: twentyFourHoursAgo },
    },
  });

  if (existing) {
    return {
      id: existing.id,
      onboardingSessionId: existing.id,
      name: `${existing.firstName} ${existing.lastName}`.trim(),
      email: existing.email,
      phone: existing.phone,
      status: existing.status,
      createdAt: existing.createdAt.toISOString(),
      updatedAt: existing.updatedAt.toISOString(),
    };
  }

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      firstName,
      lastName,
      email: normalizedEmail,
      phone: trimmedPhone,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    },
  });

  return {
    id: user.id,
    onboardingSessionId: user.id,
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    phone: user.phone,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}


export async function submitRiskProfile(config: AppConfig, body: Record<string, unknown>) {
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

  const sessionUser = await prisma.user.findFirst({
    where: { id: onboardingSessionId },
  });

  if (!sessionUser) {
    throw new HttpError(400, 'INVALID_SESSION', 'Onboarding session not found.');
  }
  if (sessionUser.email !== normalizedEmail) {
    throw new HttpError(400, 'SESSION_EMAIL_MISMATCH', 'Onboarding session does not match the submitted email.');
  }

  const riskCategory = computeRiskCategory(answers);

  const profile = await prisma.riskProfile.upsert({
    where: { userId: sessionUser.id },
    update: {
      answersJson: answers as any,
      riskCategory: riskCategory as any,
      riskScore: riskCategory === 'aggressive' ? 80 : riskCategory === 'moderate' ? 50 : 20,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      userId: sessionUser.id,
      ageBand: (answers as any).ageBand || 'unknown',
      investmentHorizon: (answers as any).investmentHorizon || 'unknown',
      incomeBand: (answers as any).incomeBand || 'unknown',
      lossTolerance: (answers as any).lossTolerance || 'unknown',
      investmentExperience: (answers as any).investmentExperience || 'unknown',
      riskScore: riskCategory === 'aggressive' ? 80 : riskCategory === 'moderate' ? 50 : 20,
      riskCategory: riskCategory as any,
      answersJson: answers as any,
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return {
    id: profile.id,
    onboardingSessionId,
    email: normalizedEmail,
    answers,
    riskCategory,
    createdAt: profile.createdAt.toISOString(),
  };
}


export async function submitKycDocuments(config: AppConfig, body: Record<string, unknown>) {
  const { email, documentType, documentRef, onboardingSessionId } = body || {};

  if (!onboardingSessionId || typeof onboardingSessionId !== 'string' || onboardingSessionId.trim().length === 0) {
    throw new HttpError(400, 'SESSION_REQUIRED', 'Onboarding session ID is required.');
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    throw new HttpError(400, 'EMAIL_REQUIRED', 'A valid email is required.');
  }

  if (!documentType || typeof documentType !== 'string' || (documentType as string).trim().length === 0) {
    throw new HttpError(400, 'DOCUMENT_TYPE_REQUIRED', 'Document type is required.');
  }

  if (!documentRef || typeof documentRef !== 'string' || (documentRef as string).trim().length === 0) {
    throw new HttpError(400, 'DOCUMENT_REF_REQUIRED', 'Document reference is required.');
  }

  const sessionUser = await prisma.user.findFirst({
    where: { id: onboardingSessionId },
  });

  if (!sessionUser) {
    throw new HttpError(400, 'INVALID_SESSION', 'Onboarding session not found.');
  }
  if (sessionUser.email !== normalizedEmail) {
    throw new HttpError(400, 'SESSION_EMAIL_MISMATCH', 'Onboarding session does not match the submitted email.');
  }

  const now = new Date();
  const kycProfile = await prisma.kycProfile.upsert({
    where: { userId: sessionUser.id },
    update: {
      documentRefsJson: [{
        type: (documentType as string).trim(),
        ref: (documentRef as string).trim(),
        status: 'pending_review',
        uploadedAt: now.toISOString(),
      }] as any,
      reviewStatus: 'pending',
      updatedAt: now,
    },
    create: {
      id: randomUUID(),
      userId: sessionUser.id,
      documentRefsJson: [{
        type: (documentType as string).trim(),
        ref: (documentRef as string).trim(),
        status: 'pending_review',
        uploadedAt: now.toISOString(),
      }] as any,
      reviewStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    },
  });

  return {
    id: kycProfile.id,
    onboardingSessionId,
    email: normalizedEmail,
    documentType: (documentType as string).trim(),
    documentRef: (documentRef as string).trim(),
    status: 'pending_review',
    createdAt: kycProfile.createdAt.toISOString(),
  };
}
