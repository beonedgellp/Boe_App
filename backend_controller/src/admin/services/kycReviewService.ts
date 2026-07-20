import type { KycReviewBody } from '#types/services.js';
import type { AppConfig, Actor } from '#types/index.js';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
import { withReceipt } from '#shared/services/withReceipt.js';

async function _reviewKyc(config: AppConfig, actor: Actor, userId: string, body: KycReviewBody) {
  const action = String(body?.action || '').trim().toLowerCase();
  const reason = String(body?.reason || '').trim();

  if (!['approve', 'reject'].includes(action)) {
    throw new HttpError(400, 'INVALID_ACTION', 'Action must be "approve" or "reject".');
  }

  if (action === 'reject' && !reason) {
    throw new HttpError(400, 'REASON_REQUIRED', 'Rejection reason is required.');
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, kycStatus: true, riskProfileStatus: true },
    });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');

    const profile = await tx.kycProfile.findUnique({
      where: { userId },
      select: { id: true, reviewStatus: true },
    });
    if (!profile) throw new HttpError(404, 'KYC_PROFILE_NOT_FOUND', 'KYC profile not found for user.');

    if (profile.reviewStatus === 'approved' && action === 'approve') {
      throw new HttpError(400, 'ALREADY_APPROVED', 'KYC is already approved.');
    }

    const beforeStatus = user.status;
    const beforeKycStatus = user.kycStatus;
    const beforeReviewStatus = profile.reviewStatus;

    const approve = action === 'approve';
    const newUserStatus = approve ? 'approved' : 'rejected';
    const newKycStatus = approve ? 'approved' : 'rejected';
    const newRiskStatus = approve ? 'approved' : 'rejected';
    const newReviewStatus = approve ? 'approved' : 'rejected';

    await tx.user.update({
      where: { id: userId },
      data: {
        status: newUserStatus,
        kycStatus: newKycStatus,
        riskProfileStatus: newRiskStatus,
        approvedAt: approve ? now : null,
      },
    });

    await tx.kycProfile.update({
      where: { userId },
      data: {
        reviewStatus: newReviewStatus,
        adminNotes: reason || null,
        reviewedAt: now,
        reviewedBy: actor?.userId || null,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: actor?.userId || null,
        action: `kyc.${action}`,
        entityType: 'kyc_profile',
        entityId: profile.id,
        beforeJson: { status: beforeStatus, kycStatus: beforeKycStatus, reviewStatus: beforeReviewStatus },
        afterJson: { status: newUserStatus, kycStatus: newKycStatus, reviewStatus: newReviewStatus },
        reason: reason || `KYC ${action}d by admin`,
      },
    });

    return {
      userId,
      action,
      previousStatus: beforeReviewStatus,
      reviewStatus: newReviewStatus,
      userStatus: newUserStatus,
      reviewedAt: now.toISOString(),
    };
  });
}

export const reviewKyc = withReceipt(_reviewKyc, (result: Record<string, unknown>) => {
  return result.action === 'approve' ? 'kyc_approved' : 'kyc_rejected';
}, {
  entityType: 'kyc_profile',
  entityId: (result: Record<string, unknown>) => result.userId,
  afterState: (result: Record<string, unknown>) => result.reviewStatus,
  subjectUserId: (result: Record<string, unknown>) => result.userId,
  source: 'mock',
});
