import { randomUUID } from 'node:crypto';
import { HttpError } from '../../http/errors.js';
import { query, transaction } from '../../db/client.js';
import { jsonStoreEnabled, readJsonStore, updateJsonStore } from '../../db/jsonStore.js';
import { withReceipt } from '../../shared/services/withReceipt.js';

async function _reviewKyc(config, actor, userId, body) {
  const action = String(body?.action || '').trim().toLowerCase();
  const reason = String(body?.reason || '').trim();

  if (!['approve', 'reject'].includes(action)) {
    throw new HttpError(400, 'INVALID_ACTION', 'Action must be "approve" or "reject".');
  }

  if (action === 'reject' && !reason) {
    throw new HttpError(400, 'REASON_REQUIRED', 'Rejection reason is required.');
  }

  const now = new Date().toISOString();

  if (!jsonStoreEnabled(config)) {
    return transaction(config, async (client) => {
      const userResult = await client.query(`
        SELECT id, status::text, kyc_status::text, risk_profile_status::text
        FROM users
        WHERE id = $1
        FOR UPDATE
      `, [userId]);
      const user = userResult.rows[0];
      if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');

      const profileResult = await client.query(`
        SELECT id, review_status::text
        FROM kyc_profiles
        WHERE user_id = $1
        FOR UPDATE
      `, [userId]);
      const profile = profileResult.rows[0];
      if (!profile) throw new HttpError(404, 'KYC_PROFILE_NOT_FOUND', 'KYC profile not found for user.');

      if (profile.review_status === 'approved' && action === 'approve') {
        throw new HttpError(400, 'ALREADY_APPROVED', 'KYC is already approved.');
      }

      const beforeStatus = user.status;
      const beforeKycStatus = user.kyc_status;
      const beforeReviewStatus = profile.review_status;

      const newUserStatus = action === 'approve' ? 'approved' : 'rejected';
      const newKycStatus = action === 'approve' ? 'approved' : 'rejected';
      const newRiskStatus = action === 'approve' ? 'approved' : 'rejected';
      const newReviewStatus = action === 'approve' ? 'approved' : 'rejected';

      await client.query(`
        UPDATE users
        SET status = $2::user_status,
            kyc_status = $3::review_status,
            risk_profile_status = $4::review_status,
            approved_at = CASE WHEN $2::user_status = 'approved' THEN now() ELSE NULL END,
            updated_at = now()
        WHERE id = $1
      `, [userId, newUserStatus, newKycStatus, newRiskStatus]);

      await client.query(`
        UPDATE kyc_profiles
        SET review_status = $2::review_status,
            admin_notes = $3,
            reviewed_at = now(),
            reviewed_by = $4,
            updated_at = now()
        WHERE user_id = $1
      `, [userId, newReviewStatus, reason || null, actor?.userId || null]);

      await client.query(`
        INSERT INTO admin_audit_logs (
          admin_id, action, entity_type, entity_id, before_json, after_json, reason, ip_address, user_agent
        )
        VALUES ($1, $2, 'kyc_profile', $3, $4::jsonb, $5::jsonb, $6, $7::inet, $8)
      `, [
        actor?.userId || null,
        `kyc.${action}`,
        profile.id,
        JSON.stringify({ status: beforeStatus, kycStatus: beforeKycStatus, reviewStatus: beforeReviewStatus }),
        JSON.stringify({ status: newUserStatus, kycStatus: newKycStatus, reviewStatus: newReviewStatus }),
        reason || `KYC ${action}d by admin`,
        null,
        null,
      ]);

      return {
        userId,
        action,
        previousStatus: beforeReviewStatus,
        reviewStatus: newReviewStatus,
        userStatus: newUserStatus,
        reviewedAt: now,
      };
    });
  }

  const result = await updateJsonStore(config, (store) => {
    const user = store.users.find((u) => u.id === userId);
    if (!user) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    const profile = store.kycProfiles.find((p) => p.userId === userId);
    if (!profile) {
      throw new HttpError(404, 'KYC_PROFILE_NOT_FOUND', 'KYC profile not found for user.');
    }

    if (profile.reviewStatus === 'approved' && action === 'approve') {
      throw new HttpError(400, 'ALREADY_APPROVED', 'KYC is already approved.');
    }

    const beforeStatus = user.status;
    const beforeKycStatus = user.kycStatus;
    const beforeReviewStatus = profile.reviewStatus;

    if (action === 'approve') {
      user.kycStatus = 'approved';
      user.status = 'approved';
      user.riskProfileStatus = 'approved';
      user.approvedAt = now;
      profile.reviewStatus = 'approved';
    } else {
      user.kycStatus = 'rejected';
      user.status = 'rejected';
      user.riskProfileStatus = 'rejected';
      profile.reviewStatus = 'rejected';
    }

    profile.adminNotes = reason || null;
    profile.reviewedAt = now;
    profile.reviewerId = actor?.userId || null;
    user.updatedAt = now;

    const auditLog = {
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: `kyc.${action}`,
      entityType: 'kyc_profile',
      entityId: profile.id,
      before: { status: beforeStatus, kycStatus: beforeKycStatus, reviewStatus: beforeReviewStatus },
      after: { status: user.status, kycStatus: user.kycStatus, reviewStatus: profile.reviewStatus },
      reason: reason || `KYC ${action}d by admin`,
      ipAddress: null,
      userAgent: null,
      createdAt: now,
    };

    if (!Array.isArray(store.adminAuditLogs)) store.adminAuditLogs = [];
    store.adminAuditLogs.push(auditLog);

    return {
      userId,
      action,
      previousStatus: beforeReviewStatus,
      reviewStatus: profile.reviewStatus,
      userStatus: user.status,
      reviewedAt: now,
    };
  });

  return result;
}

export const reviewKyc = withReceipt(_reviewKyc, (result) => {
  return result.action === 'approve' ? 'kyc_approved' : 'kyc_rejected';
}, {
  entityType: 'kyc_profile',
  entityId: (result) => result.userId,
  afterState: (result) => result.reviewStatus,
  subjectUserId: (result) => result.userId,
  source: 'mock',
});
