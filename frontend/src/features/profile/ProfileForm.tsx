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
    <form onSubmit={handleSubmit(onSave)} className="space-y-5">
      {/* Full Name Field */}
      <div>
        <label className="veridian-label">Full Name</label>
        <input
          {...register('fullName')}
          className="veridian-input"
        />
        {errors.fullName ? <p className="veridian-error mt-1">{errors.fullName.message}</p> : null}
      </div>

      {/* Username Field */}
      <div>
        <label className="veridian-label">Username</label>
        <input
          {...register('username')}
          className="veridian-input"
        />
        <p className="mt-1.5 text-xs text-slate-caption">Usernames can contain letters, numbers, underscores, and dots.</p>
        {errors.username ? <p className="veridian-error mt-1">{errors.username.message}</p> : null}
      </div>

      {/* Bio Field */}
      <div>
        <label className="veridian-label">Bio</label>
        <textarea
          {...register('bio')}
          rows={4}
          className="veridian-input resize-none"
        />
        {errors.bio ? <p className="veridian-error mt-1">{errors.bio.message}</p> : null}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="veridian-btn-secondary inline-flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="veridian-btn-primary inline-flex items-center gap-2"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
