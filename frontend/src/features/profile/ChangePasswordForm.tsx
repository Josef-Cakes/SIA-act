import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, LockKeyhole, CheckCircle2 } from 'lucide-react';
import Spinner from '../../components/Spinner';
import { getPasswordStrength } from './passwordStrength';
import { changePasswordSchema, type ChangePasswordFormValues } from './validationSchemas';

interface ChangePasswordFormProps {
  onSubmitPassword: (values: ChangePasswordFormValues) => Promise<void>;
}

function getStrengthColor(score: number): string {
  if (score <= 1) return 'bg-veridian-rose';
  if (score === 2) return 'bg-veridian-amber';
  if (score === 3) return 'bg-veridian-emerald';
  return 'bg-veridian-sky';
}

export default function ChangePasswordForm({ onSubmitPassword }: ChangePasswordFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
  });

  const newPassword = watch('newPassword') ?? '';
  const confirmNewPassword = watch('confirmNewPassword') ?? '';

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const passwordsMatch = newPassword.length > 0 && confirmNewPassword.length > 0 && newPassword === confirmNewPassword;
  const meetsEntropyGate = strength.entropyBits >= 45;

  return (
    <div className="rounded-container border border-white/10 bg-deep-slate p-6 shadow-card">
      <h2 className="mb-6 text-xl font-semibold text-white">Change Password</h2>

      <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-5">
        {/* Current Password */}
        <div>
          <label className="veridian-label">Current Password</label>
          <input
            {...register('currentPassword')}
            type="password"
            className="veridian-input"
          />
          {errors.currentPassword && <p className="veridian-error mt-1">{errors.currentPassword.message}</p>}
        </div>

        {/* New Password */}
        <div>
          <label className="veridian-label">New Password</label>
          <input
            {...register('newPassword')}
            type="password"
            className="veridian-input"
          />
          {errors.newPassword && <p className="veridian-error mt-1">{errors.newPassword.message}</p>}

          {/* Strength Indicator */}
          <div className="mt-3 rounded-input border border-white/10 bg-midnight-navy p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-caption">
              <span>Password strength: {strength.label}</span>
              <span>Entropy: {Math.round(strength.entropyBits)} bits</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10">
              <div
                className={`h-2 rounded-full transition-all ${getStrengthColor(strength.score)}`}
                style={{ width: `${Math.min(strength.score * 25, 100)}%` }}
              />
            </div>
            <p className={`mt-2 text-xs ${meetsEntropyGate ? 'text-veridian-emerald' : 'text-veridian-amber'}`}>
              {meetsEntropyGate ? 'Entropy requirement met (>= 45 bits).' : 'Entropy too low (requires >= 45 bits).'}
            </p>
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="veridian-label">Confirm New Password</label>
          <input
            {...register('confirmNewPassword')}
            type="password"
            className="veridian-input"
          />
          {errors.confirmNewPassword && <p className="veridian-error mt-1">{errors.confirmNewPassword.message}</p>}
          {confirmNewPassword.length > 0 && (
            <p className={`mt-1.5 inline-flex items-center gap-1 text-xs ${passwordsMatch ? 'text-veridian-emerald' : 'text-veridian-amber'}`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {passwordsMatch ? 'Passwords match.' : 'Passwords do not match yet.'}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !meetsEntropyGate}
          className="veridian-btn-primary inline-flex items-center gap-2"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
