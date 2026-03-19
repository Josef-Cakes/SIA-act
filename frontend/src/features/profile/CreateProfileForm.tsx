import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Spinner from '../../components/Spinner';
import { createProfileSchema, type CreateProfileFormValues } from './validationSchemas';

interface CreateProfileFormProps {
  onSubmitProfile: (values: CreateProfileFormValues) => Promise<void>;
}

const steps = [
  { title: 'Account', fields: ['email', 'username'] as const },
  { title: 'Details', fields: ['bio', 'role'] as const },
  { title: 'Review', fields: [] as const },
];

export default function CreateProfileForm({ onSubmitProfile }: CreateProfileFormProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CreateProfileFormValues>({
    resolver: zodResolver(createProfileSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      username: '',
      bio: '',
      role: 'USER',
    },
  });

  const values = watch();

  async function handleNext() {
    const fields = steps[stepIndex].fields;
    if (fields.length === 0) return;
    const isValid = await trigger(fields as any);
    if (isValid) setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }

  function handleBack() {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Create Profile</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">Step {stepIndex + 1} of {steps.length}</span>
      </div>

      <div className="mb-5 flex gap-2">
        {steps.map((step, index) => (
          <div key={step.title} className={`h-2 flex-1 rounded-full ${index <= stepIndex ? 'bg-cyan-400' : 'bg-slate-700'}`} />
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-5">
        {stepIndex === 0 && (
          <>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="engineer@company.com"
                className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
              />
              {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">Username</label>
              <input
                {...register('username')}
                type="text"
                placeholder="user_name"
                className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
              />
              {errors.username && <p className="mt-1 text-xs text-rose-400">{errors.username.message}</p>}
            </div>
          </>
        )}

        {stepIndex === 1 && (
          <>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Bio</label>
              <textarea
                {...register('bio')}
                rows={4}
                placeholder="Tell us about your interests and role in the team"
                className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
              />
              {errors.bio && <p className="mt-1 text-xs text-rose-400">{errors.bio.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">Role</label>
              <select {...register('role')} className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100">
                <option value="USER">User</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
              {errors.role && <p className="mt-1 text-xs text-rose-400">{errors.role.message}</p>}
            </div>
          </>
        )}

        {stepIndex === 2 && (
          <div className="space-y-3 rounded-xl border border-cyan-900/60 bg-slate-950/70 p-4 text-sm">
            <div className="text-slate-300">Review your profile before submitting:</div>
            <div className="grid gap-2 text-slate-100 sm:grid-cols-2">
              <div><span className="text-slate-400">Email:</span> {values.email}</div>
              <div><span className="text-slate-400">Username:</span> {values.username}</div>
              <div><span className="text-slate-400">Role:</span> {values.role}</div>
              <div className="sm:col-span-2"><span className="text-slate-400">Bio:</span> {values.bio}</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleBack}
            disabled={stepIndex === 0 || isSubmitting}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>

          {stepIndex < steps.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? <Spinner size="sm" /> : null}
              {isSubmitting ? 'Creating...' : 'Create Profile'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
