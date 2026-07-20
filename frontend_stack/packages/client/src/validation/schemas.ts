import { z } from 'zod';

export const loginFormSchema = z.object({
  identifier: z.string().min(1, 'Email, phone, or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const signupFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(6, 'Enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const onboardingFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(1, 'Phone is required'),
});

export const supportTicketSchema = z.object({
  subject: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.enum(['general', 'technical', 'billing', 'kyc', 'sip', 'withdrawal', 'mandate']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;
export type SignupFormData = z.infer<typeof signupFormSchema>;
export type OnboardingFormData = z.infer<typeof onboardingFormSchema>;
export type SupportTicketData = z.infer<typeof supportTicketSchema>;
