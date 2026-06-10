import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { readJsonStore, updateJsonStore } from '#db/pgAdapter.js';
import { withReceipt } from '#shared/services/withReceipt.js';

const FATCA_STATUSES = new Set(['not_started', 'pending', 'completed', 'exempt']);
const REKYC_TRIGGERS = new Set(['annual_review', 'address_change', 'pan_update', 'nominee_change', 'other']);

function isMinor(dateOfBirth) {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age < 18;
}

function validateNominees(nominees) {
  if (!Array.isArray(nominees)) {
    throw new HttpError(400, 'INVALID_NOMINEES', 'Nominees must be an array.');
  }
  if (nominees.length > 3) {
    throw new HttpError(400, 'TOO_MANY_NOMINEES', 'Maximum 3 nominees allowed.');
  }

  const totalPercentage = nominees.reduce((sum, n) => sum + (Number(n.percentage) || 0), 0);
  if (nominees.length > 0 && totalPercentage !== 100) {
    throw new HttpError(400, 'NOMINEE_PERCENTAGE_MISMATCH', `Nominee percentages must total 100%. Current total: ${totalPercentage}%.`);
  }

  for (const nominee of nominees) {
    if (!nominee.name || typeof nominee.name !== 'string' || nominee.name.trim().length < 1) {
      throw new HttpError(400, 'INVALID_NOMINEE_NAME', 'Each nominee must have a valid name.');
    }
    if (!nominee.relationship || typeof nominee.relationship !== 'string') {
      throw new HttpError(400, 'INVALID_NOMINEE_RELATIONSHIP', 'Each nominee must have a relationship.');
    }
    if (!nominee.dateOfBirth || typeof nominee.dateOfBirth !== 'string') {
      throw new HttpError(400, 'INVALID_NOMINEE_DOB', 'Each nominee must have a date of birth.');
    }
    if (typeof nominee.percentage !== 'number' || nominee.percentage <= 0 || nominee.percentage > 100) {
      throw new HttpError(400, 'INVALID_NOMINEE_PERCENTAGE', 'Each nominee percentage must be between 1 and 100.');
    }
    if (isMinor(nominee.dateOfBirth)) {
      if (!nominee.guardianName || typeof nominee.guardianName !== 'string' || nominee.guardianName.trim().length < 1) {
        throw new HttpError(400, 'GUARDIAN_REQUIRED', 'Guardian name is required for minor nominees.');
      }
    }
  }
}

function defaultKycProfile(userId) {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    userId,
    panNumberEncrypted: null,
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
    adminNotes: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function toApiKycProfile(profile, user) {
  return {
    id: profile.id,
    userId: profile.userId,
    panLast4: profile.panLast4 || null,
    aadhaarLast4: profile.aadhaarLast4 || null,
    addressJson: profile.addressJson || {},
    documentRefsJson: profile.documentRefsJson || [],
    fatcaStatus: profile.fatcaStatus || 'not_started',
    fatcaDeclaration: profile.fatcaDeclaration || null,
    nominees: profile.nominees || [],
    reKycDueDate: profile.reKycDueDate || null,
    reKycTriggerReason: profile.reKycTriggerReason || null,
    reviewStatus: profile.reviewStatus || 'not_started',
    adminNotes: profile.adminNotes || null,
    reviewedAt: profile.reviewedAt || null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    user: user ? {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      kycStatus: user.kycStatus || 'not_started',
      status: user.status,
    } : null,
  };
}

export async function getKycStatus(config, actor) {
  const store = await readJsonStore(config);
  let profile = store.kycProfiles.find((p) => p.userId === actor.userId);
  let user = store.users.find((u) => u.id === actor.userId);

  if (!profile) {
    const defaultProfile = defaultKycProfile(actor.userId);
    await updateJsonStore(config, (s) => {
      if (!Array.isArray(s.kycProfiles)) s.kycProfiles = [];
      s.kycProfiles.push(defaultProfile);
      return defaultProfile;
    });
    profile = defaultProfile;
  }

  return toApiKycProfile(profile, user);
}

async function _updateKycDepth(config, actor, body) {
  const fatcaStatus = body.fatcaStatus;
  const fatcaDeclaration = body.fatcaDeclaration;
  const nominees = body.nominees;
  const reKycDueDate = body.reKycDueDate;
  const reKycTriggerReason = body.reKycTriggerReason;

  if (fatcaStatus !== undefined && !FATCA_STATUSES.has(fatcaStatus)) {
    throw new HttpError(400, 'INVALID_FATCA_STATUS', `FATCA status must be one of: ${[...FATCA_STATUSES].join(', ')}.`);
  }

  if (reKycTriggerReason !== undefined && reKycTriggerReason !== null && !REKYC_TRIGGERS.has(reKycTriggerReason)) {
    throw new HttpError(400, 'INVALID_REKYC_TRIGGER', `Re-KYC trigger reason must be one of: ${[...REKYC_TRIGGERS].join(', ')}.`);
  }

  if (reKycDueDate !== undefined && reKycDueDate !== null) {
    const d = new Date(reKycDueDate);
    if (Number.isNaN(d.getTime())) {
      throw new HttpError(400, 'INVALID_REKYC_DATE', 'Re-KYC due date must be a valid ISO date string.');
    }
  }

  if (fatcaDeclaration !== undefined && fatcaDeclaration !== null) {
    if (typeof fatcaDeclaration !== 'object') {
      throw new HttpError(400, 'INVALID_FATCA_DECLARATION', 'FATCA declaration must be an object.');
    }
    if (!fatcaDeclaration.taxResidence || typeof fatcaDeclaration.taxResidence !== 'string') {
      throw new HttpError(400, 'INVALID_TAX_RESIDENCE', 'Tax residence is required in FATCA declaration.');
    }
    if (typeof fatcaDeclaration.usPerson !== 'boolean') {
      throw new HttpError(400, 'INVALID_US_PERSON', 'US person flag must be a boolean in FATCA declaration.');
    }
    if (fatcaDeclaration.usPerson && (!fatcaDeclaration.tin || typeof fatcaDeclaration.tin !== 'string')) {
      throw new HttpError(400, 'TIN_REQUIRED', 'TIN is required when US person is true.');
    }
  }

  if (nominees !== undefined) {
    validateNominees(nominees);
  }

  const updated = await updateJsonStore(config, (store) => {
    let profile = store.kycProfiles.find((p) => p.userId === actor.userId);
    if (!profile) {
      profile = defaultKycProfile(actor.userId);
      store.kycProfiles.push(profile);
    }

    const now = new Date().toISOString();

    if (fatcaStatus !== undefined) {
      profile.fatcaStatus = fatcaStatus;
    }
    if (fatcaDeclaration !== undefined) {
      profile.fatcaDeclaration = fatcaDeclaration;
      if (fatcaDeclaration && profile.fatcaStatus === 'not_started') {
        profile.fatcaStatus = 'pending';
      }
    }
    if (nominees !== undefined) {
      profile.nominees = nominees.map((n) => ({
        name: String(n.name).trim(),
        relationship: String(n.relationship).trim(),
        dateOfBirth: String(n.dateOfBirth).trim(),
        percentage: Number(n.percentage),
        guardianName: isMinor(n.dateOfBirth) ? String(n.guardianName).trim() : null,
      }));
    }
    if (reKycDueDate !== undefined) {
      profile.reKycDueDate = reKycDueDate;
    }
    if (reKycTriggerReason !== undefined) {
      profile.reKycTriggerReason = reKycTriggerReason;
    }

    profile.updatedAt = now;
    return profile;
  });

  const store = await readJsonStore(config);
  const user = store.users.find((u) => u.id === actor.userId);
  return toApiKycProfile(updated, user);
}

export const updateKycDepth = withReceipt(_updateKycDepth, 'kyc_updated', {
  entityType: 'kyc_profile',
  entityId: (result) => result.id,
  afterState: (result) => result.reviewStatus,
  source: 'derived',
});
