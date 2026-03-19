import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Spinner from '../../components/Spinner';
import { editProfileSchema, type EditProfileFormValues } from './validationSchemas';
import type { ProfileViewModel } from './types';

interface EditProfileFormProps {
  profile: ProfileViewModel;
  onSubmitProfile: (values: EditProfileFormValues) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<void>;
}

export default function EditProfileForm({ profile, onSubmitProfile, onUploadAvatar }: EditProfileFormProps) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const avatarPreview = useMemo(() => {
    if (avatarFile) return URL.createObjectURL(avatarFile);
    return profile.avatarUrl;
  }, [avatarFile, profile.avatarUrl]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      email: profile.email,
      username: profile.username,
      bio: profile.bio,
      role: profile.role,
    },
  });

  async function handleAvatarUpload() {
    if (!avatarFile) return;
    setIsUploading(true);
    try {
      await onUploadAvatar(avatarFile);
      setAvatarFile(null);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
      <h2 className="mb-6 text-xl font-semibold text-slate-100">Edit Profile</h2>

      <div className="mb-6 grid gap-4 sm:grid-cols-[120px_1fr]">
        <div className="h-[120px] w-[120px] overflow-hidden rounded-2xl border border-dashed border-slate-500 bg-slate-800/40">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-300">Avatar Placeholder</div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">Upload Avatar (placeholder flow)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
            className="block w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="button"
            disabled={!avatarFile || isUploading}
            onClick={handleAvatarUpload}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? <Spinner size="sm" /> : null}
            {isUploading ? 'Uploading...' : 'Upload Avatar'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmitProfile)} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Email</label>
          <input
            {...register('email')}
            type="email"
            className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
          />
          {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Username</label>
          <input
            {...register('username')}
            className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
          />
          {errors.username && <p className="mt-1 text-xs text-rose-400">{errors.username.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-slate-300">Bio</label>
          <textarea
            {...register('bio')}
            rows={4}
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

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Spinner size="sm" /> : null}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
