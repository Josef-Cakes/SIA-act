import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be at most 24 characters')
    .regex(/^[a-zA-Z0-9._]+$/, 'Usernames can contain letters, numbers, underscores, and dots.'),
  bio: z.string().min(10, 'Bio must be at least 10 characters').max(280, 'Bio must be at most 280 characters'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialValues: ProfileFormValues;
  onSave: (payload: ProfileFormValues) => Promise<void>;
  onCancel: () => void;
}

export default function ProfileForm({ initialValues, onSave, onCancel }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialValues,
    mode: 'onChange',
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-300">Full Name</label>
        <input
          {...register('fullName')}
          className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-slate-100 focus:border-cyan-300"
        />
        {errors.fullName ? <p className="mt-1 text-xs text-rose-400">{errors.fullName.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-300">Username</label>
        <input
          {...register('username')}
          className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-slate-100 focus:border-cyan-300"
        />
        <p className="mt-1 text-xs text-slate-400">Usernames can contain letters, numbers, underscores, and dots.</p>
        {errors.username ? <p className="mt-1 text-xs text-rose-400">{errors.username.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-300">Bio</label>
        <textarea
          {...register('bio')}
          rows={4}
          className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-slate-100 focus:border-cyan-300"
        />
        {errors.bio ? <p className="mt-1 text-xs text-rose-400">{errors.bio.message}</p> : null}
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
