import { z } from 'zod';

export const createProfileSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be at most 24 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can contain letters, numbers, and underscore'),
  bio: z.string().min(10, 'Bio must be at least 10 characters').max(280, 'Bio must be at most 280 characters'),
  role: z.enum(['USER', 'MANAGER', 'ADMIN']),
});

export const editProfileSchema = createProfileSchema;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(12, 'New password must be at least 12 characters')
      .regex(/[a-z]/, 'Must include at least one lowercase letter')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter')
      .regex(/[0-9]/, 'Must include at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Must include at least one symbol'),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmNewPassword'],
        message: 'New password and confirm password do not match',
      });
    }
    if (value.newPassword === value.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPassword'],
        message: 'New password must be different from current password',
      });
    }
  });

export type CreateProfileFormValues = z.infer<typeof createProfileSchema>;
export type EditProfileFormValues = z.infer<typeof editProfileSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
