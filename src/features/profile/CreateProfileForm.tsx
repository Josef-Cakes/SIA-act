import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
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
    <div className="rounded-container border border-white/10 bg-deep-slate p-6 shadow-card">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Create Profile</h2>
        <span className="rounded-full bg-midnight-navy px-3 py-1.5 text-xs text-slate-caption">
          Step {stepIndex + 1} of {steps.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 flex gap-2">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className={`h-2 flex-1 rounded-full transition-colors ${
              index <= stepIndex ? 'bg-veridian-emerald' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-5">
        {/* Step 1: Account */}
        {stepIndex === 0 && (
          <>
            <div>
              <label className="veridian-label">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@company.com"
                className="veridian-input"
              />
              {errors.email && <p className="veridian-error mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="veridian-label">Username</label>
              <input
                {...register('username')}
                type="text"
                placeholder="user_name"
                className="veridian-input"
              />
              {errors.username && <p className="veridian-error mt-1">{errors.username.message}</p>}
            </div>
          </>
        )}

        {/* Step 2: Details */}
        {stepIndex === 1 && (
          <>
            <div>
              <label className="veridian-label">Bio</label>
              <textarea
                {...register('bio')}
                rows={4}
                placeholder="Tell us about your interests and role in the team"
                className="veridian-input resize-none"
              />
              {errors.bio && <p className="veridian-error mt-1">{errors.bio.message}</p>}
            </div>

            <div>
              <label className="veridian-label">Role</label>
              <select {...register('role')} className="veridian-input">
                <option value="USER">User</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
              {errors.role && <p className="veridian-error mt-1">{errors.role.message}</p>}
            </div>
          </>
        )}

        {/* Step 3: Review */}
        {stepIndex === 2 && (
          <div className="space-y-3 rounded-input border border-veridian-emerald/20 bg-midnight-navy p-4 text-sm">
            <div className="text-slate-caption">Review your profile before submitting:</div>
            <div className="grid gap-3 text-white sm:grid-cols-2">
              <div>
                <span className="text-slate-caption">Email:</span> {values.email}
              </div>
              <div>
                <span className="text-slate-caption">Username:</span> {values.username}
              </div>
              <div>
                <span className="text-slate-caption">Role:</span> {values.role}
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-caption">Bio:</span> {values.bio}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={stepIndex === 0 || isSubmitting}
            className="veridian-btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {stepIndex < steps.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="veridian-btn-primary inline-flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="veridian-btn-primary inline-flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isSubmitting ? 'Creating...' : 'Create Profile'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
