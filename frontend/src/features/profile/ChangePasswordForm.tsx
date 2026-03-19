import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Spinner from '../../components/Spinner';
import { getPasswordStrength } from './passwordStrength';
import { changePasswordSchema, type ChangePasswordFormValues } from './validationSchemas';

interface ChangePasswordFormProps {
  onSubmitPassword: (values: ChangePasswordFormValues) => Promise<void>;
}

function getStrengthColor(score: number): string {
  if (score <= 1) return 'bg-rose-500';
  if (score === 2) return 'bg-amber-500';
  if (score === 3) return 'bg-emerald-500';
  return 'bg-cyan-500';
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
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
      <h2 className="mb-6 text-xl font-semibold text-slate-100">Change Password</h2>

      <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Current Password</label>
          <input
            {...register('currentPassword')}
            type="password"
            className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
          />
          {errors.currentPassword && <p className="mt-1 text-xs text-rose-400">{errors.currentPassword.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">New Password</label>
          <input
            {...register('newPassword')}
            type="password"
            className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
          />
          {errors.newPassword && <p className="mt-1 text-xs text-rose-400">{errors.newPassword.message}</p>}

          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
              <span>Password strength: {strength.label}</span>
              <span>Entropy: {Math.round(strength.entropyBits)} bits</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-700">
              <div
                className={`h-2 rounded-full transition-all ${getStrengthColor(strength.score)}`}
                style={{ width: `${Math.min(strength.score * 25, 100)}%` }}
              />
            </div>
            <p className={`mt-2 text-xs ${meetsEntropyGate ? 'text-emerald-400' : 'text-amber-400'}`}>
              {meetsEntropyGate ? 'Entropy requirement met (>= 45 bits).' : 'Entropy too low (requires >= 45 bits).'}
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Confirm New Password</label>
          <input
            {...register('confirmNewPassword')}
            type="password"
            className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
          />
          {errors.confirmNewPassword && <p className="mt-1 text-xs text-rose-400">{errors.confirmNewPassword.message}</p>}
          {confirmNewPassword.length > 0 && (
            <p className={`mt-1 text-xs ${passwordsMatch ? 'text-emerald-400' : 'text-amber-400'}`}>
              {passwordsMatch ? 'Passwords match.' : 'Passwords do not match yet.'}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !meetsEntropyGate}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <Spinner size="sm" /> : null}
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
