import { ArrowLeft, CalendarDays, Mail, Pencil, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ToastMessage from '../../components/ToastMessage';
import { resolveBackendUrl } from '../../config/env';
import { getProfilePhotoUrl, updatePassword, updateProfile, uploadProfilePhoto } from '../auth/authService';
import AvatarUpload from './AvatarUpload';
import PasswordSection from './PasswordSection';
import ProfileForm, { type ProfileFormValues } from './ProfileForm';
import { useAuth } from '../../context/AuthContext';

interface ProfileState {
  avatarUrl?: string;
  fullName: string;
  email: string;
  username: string;
  bio: string;
  joinDate: string;
}

type ToastState = { type: 'success' | 'error'; message: string } | null;

function formatJoinDate(raw?: string): string {
  if (!raw) return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function resolveProfilePhotoUrl(url?: string): string | undefined {
  return resolveBackendUrl(url);
}

export default function ProfileDashboard() {
  const navigate = useNavigate();
  const { user, updateCachedUser } = useAuth();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const [profile, setProfile] = useState<ProfileState>({
    avatarUrl: user?.profilePhotoUrl || (user?.hasProfileImage ? getProfilePhotoUrl(user.id) : undefined),
    fullName: user?.fullName || user?.username || 'Unnamed User',
    email: user?.email || 'user@example.com',
    username: user?.username || 'username',
    bio: 'Building secure, scalable product experiences with a focus on quality and user trust.',
    joinDate: formatJoinDate(user?.createdAt),
  });

  // Sync profile state with user context - only update local state, don't fetch
  useEffect(() => {
    if (!user?.id) return;

    setProfile((prev) => ({
      ...prev,
      fullName: user.fullName || prev.fullName,
      email: user.email || prev.email,
      username: user.username || prev.username,
      joinDate: formatJoinDate(user.createdAt || prev.joinDate),
      avatarUrl: resolveProfilePhotoUrl(user.profilePhotoUrl)
        || (user.hasProfileImage ? getProfilePhotoUrl(user.id) : prev.avatarUrl),
    }));

  }, [user]); // AuthContext owns profile hydration; this effect only mirrors the cached user into local form state

  function handleBackToDashboard() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/dashboard');
  }

  async function handleSaveProfile(values: ProfileFormValues) {
    if (!user?.id) {
      setToast({ type: 'error', message: 'You need to be logged in to update your profile.' });
      return;
    }

    try {
      const response = await updateProfile(user.id, {
        username: values.username,
        fullName: values.fullName,
        email: profile.email,
      });

      if (!response?.success || !response?.data) {
        setToast({ type: 'error', message: response?.message || 'Profile update failed.' });
        return;
      }

      const updatedUser = response.data;
      updateCachedUser((previous) => ({
        ...previous,
        ...updatedUser,
        profilePhotoUrl: resolveProfilePhotoUrl(updatedUser.profilePhotoUrl) || previous?.profilePhotoUrl,
      }));
      setProfile((prev) => ({
        ...prev,
        fullName: updatedUser.fullName || prev.fullName,
        username: updatedUser.username || prev.username,
        email: updatedUser.email || prev.email,
        bio: values.bio,
      }));
      setIsEditingProfile(false);
      setToast({ type: 'success', message: 'Profile updated successfully.' });
    } catch {
      setToast({ type: 'error', message: 'Profile update failed.' });
    }
  }

  async function handleUploadAvatar(file: File) {
    if (!user?.id) {
      setToast({ type: 'error', message: 'You need to be logged in to upload a photo.' });
      return;
    }

    try {
      const response = await uploadProfilePhoto(user.id, file);

      if (!response?.success || !response?.data) {
        setToast({ type: 'error', message: response?.message || 'Photo upload failed.' });
        return;
      }

      const serverPhotoUrl = response.data.profilePhotoUrl
        ? resolveProfilePhotoUrl(response.data.profilePhotoUrl)
        : getProfilePhotoUrl(user.id);

      updateCachedUser((previous) => ({
        ...previous,
        ...response.data,
        hasProfileImage: true,
        profilePhotoUrl: serverPhotoUrl,
      }));
      setProfile((prev) => ({ ...prev, avatarUrl: serverPhotoUrl }));
      setToast({ type: 'success', message: 'Photo uploaded and saved.' });
    } catch {
      setToast({ type: 'error', message: 'Photo upload failed.' });
    }
  }

  async function handleChangePassword(values: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) {
    if (!user?.id) {
      setToast({ type: 'error', message: 'You need to be logged in to change password.' });
      return;
    }

    try {
      const response = await updatePassword(user.id, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmNewPassword,
      });

      if (!response?.success) {
        setToast({ type: 'error', message: response?.message || 'Password update failed.' });
        return;
      }
      setToast({ type: 'success', message: 'Password changed successfully.' });
    } catch {
      setToast({ type: 'error', message: 'Password update failed.' });
    }
  }

  return (
    <div className="min-h-screen bg-midnight-navy px-4 py-8 sm:px-6 lg:px-10 font-sans">
      {toast ? <ToastMessage type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}

      <div className="mx-auto max-w-6xl">
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBackToDashboard}
          className="mb-6 inline-flex items-center gap-2 rounded-input border border-white/15 bg-deep-slate px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors min-h-touch"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Profile Header Card */}
        <div className="mb-6 rounded-container border border-white/10 bg-deep-slate p-6 shadow-card">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-1 items-start gap-4">
              {/* Avatar */}
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-veridian-emerald/40 bg-deep-slate">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-caption">
                    <UserRound className="h-8 w-8" />
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold text-white">{profile.fullName}</h1>
                <p className="mt-1 text-sm text-slate-caption">@{profile.username}</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-caption sm:grid-cols-2">
                  <p className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4 text-veridian-emerald" />
                    {profile.email}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-veridian-emerald" />
                    Joined {profile.joinDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => setIsEditingProfile((value) => !value)}
              className="inline-flex items-center gap-2 self-start rounded-input border border-white/15 bg-deep-slate px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors min-h-touch"
            >
              <Pencil className="h-4 w-4" />
              {isEditingProfile ? 'Close Edit' : 'Edit Profile'}
            </button>
          </div>

          {/* Bio Section */}
          <div className="mt-5 rounded-input border border-white/10 bg-midnight-navy p-4">
            <p className="text-xs uppercase tracking-wider text-slate-caption font-medium">Bio</p>
            <p className="mt-2 text-sm text-white/90">{profile.bio}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {/* Profile Details Section */}
            <section className="rounded-container border border-white/10 bg-deep-slate p-6 shadow-elevated">
              <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-caption">Profile Details</h2>

              {isEditingProfile ? (
                <ProfileForm
                  initialValues={{
                    fullName: profile.fullName,
                    username: profile.username,
                    bio: profile.bio,
                  }}
                  onSave={handleSaveProfile}
                  onCancel={() => setIsEditingProfile(false)}
                />
              ) : (
                <div className="grid gap-4 text-sm text-white sm:grid-cols-2">
                  <div className="rounded-input border border-white/10 bg-midnight-navy p-4">
                    <p className="text-xs uppercase text-slate-caption font-medium">Full Name</p>
                    <p className="mt-1.5 text-white/90">{profile.fullName}</p>
                  </div>
                  <div className="rounded-input border border-white/10 bg-midnight-navy p-4">
                    <p className="text-xs uppercase text-slate-caption font-medium">Username</p>
                    <p className="mt-1.5 text-white/90">{profile.username}</p>
                  </div>
                  <div className="rounded-input border border-white/10 bg-midnight-navy p-4 sm:col-span-2">
                    <p className="text-xs uppercase text-slate-caption font-medium">Bio</p>
                    <p className="mt-1.5 text-white/90">{profile.bio}</p>
                  </div>
                </div>
              )}
            </section>

            {/* Password Section */}
            <PasswordSection onSubmitPassword={handleChangePassword} />
          </div>

          {/* Avatar Upload Sidebar */}
          <div className="space-y-6">
            <AvatarUpload initialUrl={profile.avatarUrl} onUpload={handleUploadAvatar} />
          </div>
        </div>
      </div>
    </div>
  );
}
