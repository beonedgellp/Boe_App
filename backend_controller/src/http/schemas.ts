import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(6, 'Enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const onboardingApplicationSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
});

export const onboardingRiskProfileSchema = z.object({
  email: z.string().email(),
  answers: z.record(z.unknown()),
  onboardingSessionId: z.string().min(1),
});

export const onboardingKycDocumentsSchema = z.object({
  email: z.string().email(),
  documentType: z.string().min(1),
  documentRef: z.string().min(1),
  onboardingSessionId: z.string().min(1),
});

export const createSipSchema = z.object({
  fundId: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.enum(['monthly', 'weekly', 'quarterly']),
  durationMonths: z.number().int().min(1).max(360),
});


export const createLumpsumOrderSchema = z.object({
  fundId: z.string().min(1),
  amount: z.number().positive(),
});

export const confirmRazorpaySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const sipControlRequestSchema = z.object({
  planId: z.string().min(1),
  action: z.enum(['pause', 'resume', 'skip', 'step_up', 'change_amount', 'cancel']),
  reason: z.string().optional(),
  confirmed: z.boolean().optional(),
});

export const createTicketSchema = z.object({
  title: z.string().max(200).optional(),
  subject: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  body: z.string().max(2000).optional(),
  category: z.enum(['general', 'technical', 'billing', 'kyc', 'sip', 'withdrawal', 'mandate']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

export const createRedemptionSchema = z.object({
  holdingId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().max(500).optional(),
});

export const withdrawalRedemptionSchema = z.object({
  previewId: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateSipInput = z.infer<typeof createSipSchema>;
export type CreateLumpsumOrderInput = z.infer<typeof createLumpsumOrderSchema>;
export type SipControlRequestInput = z.infer<typeof sipControlRequestSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
