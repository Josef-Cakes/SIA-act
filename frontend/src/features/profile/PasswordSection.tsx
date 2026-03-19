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

  return (
    <section className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-lg backdrop-blur-md">
      <div className="mb-4 flex items-center gap-2">
        <LockKeyhole className="h-4 w-4 text-cyan-300" />
        <h3 className="text-sm font-semibold text-slate-100">Change Password</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-300">Current Password</label>
          <input
            type="password"
            {...register('currentPassword')}
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-slate-100"
          />
          {errors.currentPassword ? <p className="mt-1 text-xs text-rose-400">{errors.currentPassword.message}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-300">New Password</label>
          <input
            type="password"
            {...register('newPassword')}
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-slate-100"
          />
          {errors.newPassword ? <p className="mt-1 text-xs text-rose-400">{errors.newPassword.message}</p> : null}

          <div className="mt-2 rounded-xl border border-white/15 bg-slate-900/60 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
              <span>Strength: {strength.label}</span>
              <span>{strength.score}/4</span>
            </div>
            <div className="h-2 rounded-full bg-slate-700">
              <div
                className={`h-2 rounded-full transition-all ${
                  strength.score <= 1
                    ? 'bg-rose-400'
                    : strength.score === 2
                      ? 'bg-amber-400'
                      : strength.score === 3
                        ? 'bg-emerald-400'
                        : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.min(strength.score * 25, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-300">Confirm New Password</label>
          <input
            type="password"
            {...register('confirmNewPassword')}
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-slate-100"
          />
          {errors.confirmNewPassword ? (
            <p className="mt-1 text-xs text-rose-400">{errors.confirmNewPassword.message}</p>
          ) : null}
          {confirmNewPassword.length > 0 ? (
            <p className={`mt-1 inline-flex items-center gap-1 text-xs ${isMatch ? 'text-emerald-400' : 'text-amber-400'}`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isMatch ? 'Passwords match' : 'Waiting for exact match'}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </section>
  );
}
