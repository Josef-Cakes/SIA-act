import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, LockKeyhole } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(12, 'New password must be at least 12 characters')
      .regex(/[a-z]/, 'Include at least one lowercase letter')
      .regex(/[A-Z]/, 'Include at least one uppercase letter')
      .regex(/[0-9]/, 'Include at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Include at least one symbol'),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword !== values.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmNewPassword'],
        message: 'Passwords do not match',
      });
    }
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface PasswordSectionProps {
  onSubmitPassword: (values: PasswordFormValues) => Promise<void>;
}

function estimateStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: 'Empty' };

  let score = 0;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, label: 'Weak' };
  if (score === 2) return { score, label: 'Fair' };
  if (score === 3) return { score, label: 'Strong' };
  return { score, label: 'Excellent' };
}

export default function PasswordSection({ onSubmitPassword }: PasswordSectionProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
  });

  const newPassword = watch('newPassword') ?? '';
  const confirmNewPassword = watch('confirmNewPassword') ?? '';

  const strength = useMemo(() => estimateStrength(newPassword), [newPassword]);
  const isMatch = newPassword.length > 0 && confirmNewPassword.length > 0 && newPassword === confirmNewPassword;

  // Get strength bar color based on score
  const getStrengthColor = (score: number) => {
    if (score <= 1) return 'bg-veridian-rose';
    if (score === 2) return 'bg-veridian-amber';
    if (score === 3) return 'bg-veridian-emerald';
    return 'bg-veridian-sky';
  };

  return (
    <section className="rounded-container border border-white/10 bg-deep-slate p-6 shadow-elevated">
      {/* Section Header */}
      <div className="mb-5 flex items-center gap-2">
        <LockKeyhole className="h-4 w-4 text-veridian-emerald" />
        <h3 className="text-sm font-semibold text-white">Change Password</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-5">
        {/* Current Password */}
        <div>
          <label className="veridian-label">Current Password</label>
          <input
            type="password"
            {...register('currentPassword')}
            className="veridian-input"
          />
          {errors.currentPassword ? <p className="veridian-error mt-1">{errors.currentPassword.message}</p> : null}
        </div>

        {/* New Password */}
        <div>
          <label className="veridian-label">New Password</label>
          <input
            type="password"
            {...register('newPassword')}
            className="veridian-input"
          />
          {errors.newPassword ? <p className="veridian-error mt-1">{errors.newPassword.message}</p> : null}

          {/* Strength Indicator */}
          <div className="mt-3 rounded-input border border-white/10 bg-midnight-navy p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-caption">
              <span>Strength: {strength.label}</span>
              <span>{strength.score}/4</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div
                className={`h-2 rounded-full transition-all ${getStrengthColor(strength.score)}`}
                style={{ width: `${Math.min(strength.score * 25, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="veridian-label">Confirm New Password</label>
          <input
            type="password"
            {...register('confirmNewPassword')}
            className="veridian-input"
          />
          {errors.confirmNewPassword ? (
            <p className="veridian-error mt-1">{errors.confirmNewPassword.message}</p>
          ) : null}
          {confirmNewPassword.length > 0 ? (
            <p className={`mt-1.5 inline-flex items-center gap-1 text-xs ${isMatch ? 'text-veridian-emerald' : 'text-veridian-amber'}`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isMatch ? 'Passwords match' : 'Waiting for exact match'}
            </p>
          ) : null}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="veridian-btn-primary inline-flex items-center gap-2"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </section>
  );
}
