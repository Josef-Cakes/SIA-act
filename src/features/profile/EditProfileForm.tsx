import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload, Save } from 'lucide-react';
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
    <div className="rounded-container border border-white/10 bg-deep-slate p-6 shadow-card">
      <h2 className="mb-6 text-xl font-semibold text-white">Edit Profile</h2>

      {/* Avatar Upload Section */}
      <div className="mb-6 grid gap-4 sm:grid-cols-[120px_1fr]">
        <div className="h-[120px] w-[120px] overflow-hidden rounded-container border-2 border-dashed border-slate-caption/30 bg-midnight-navy">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-caption">Avatar Placeholder</div>
          )}
        </div>

        <div className="space-y-3">
          <label className="veridian-label">Upload Avatar</label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
            className="veridian-input text-sm file:mr-4 file:rounded-input file:border-0 file:bg-veridian-emerald file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:brightness-110"
          />
          <button
            type="button"
            disabled={!avatarFile || isUploading}
            onClick={handleAvatarUpload}
            className="veridian-btn-primary inline-flex items-center gap-2"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? 'Uploading...' : 'Upload Avatar'}
          </button>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit(onSubmitProfile)} className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="veridian-label">Email</label>
          <input
            {...register('email')}
            type="email"
            className="veridian-input"
          />
          {errors.email && <p className="veridian-error mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="veridian-label">Username</label>
          <input
            {...register('username')}
            className="veridian-input"
          />
          {errors.username && <p className="veridian-error mt-1">{errors.username.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="veridian-label">Bio</label>
          <textarea
            {...register('bio')}
            rows={4}
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

        <div className="sm:col-span-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="veridian-btn-primary inline-flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
