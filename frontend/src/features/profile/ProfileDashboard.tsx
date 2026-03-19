import { ArrowLeft, CalendarDays, Mail, Pencil, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ToastMessage from '../../components/ToastMessage';
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

const BACKEND_BASE_URL = 'http://localhost:8080';

function formatJoinDate(raw?: string): string {
  if (!raw) return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function resolveProfilePhotoUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${BACKEND_BASE_URL}${url}`;
  return `${BACKEND_BASE_URL}/${url}`;
}

export default function ProfileDashboard() {
  const navigate = useNavigate();
  const { user, fetchProfile, updateCachedUser } = useAuth();

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

    void fetchProfile({ force: false, revalidate: true, silent: true });
  }, [user?.id, user?.fullName, user?.username, user?.email, user?.createdAt, user?.profilePhotoUrl, user?.hasProfileImage, fetchProfile]);

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
    <div className="min-h-screen bg-transparent px-4 py-8 sm:px-6 lg:px-10">
      {toast ? <ToastMessage type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}

      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={handleBackToDashboard}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="mb-6 rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-1 items-start gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full border border-cyan-300/40 bg-slate-800/70">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <UserRound className="h-8 w-8" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold text-white">{profile.fullName}</h1>
                <p className="mt-1 text-sm text-slate-200">@{profile.username}</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
                  <p className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-cyan-300" />{profile.email}</p>
                  <p className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-cyan-300" />Joined {profile.joinDate}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingProfile((value) => !value)}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              <Pencil className="h-4 w-4" />
              {isEditingProfile ? 'Close Edit' : 'Edit Profile'}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-300">Bio</p>
            <p className="mt-2 text-sm text-slate-100">{profile.bio}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-lg backdrop-blur-md">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-200">Profile Details</h2>

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
                <div className="grid gap-3 text-sm text-slate-100 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                    <p className="text-xs uppercase text-slate-300">Full Name</p>
                    <p className="mt-1">{profile.fullName}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                    <p className="text-xs uppercase text-slate-300">Username</p>
                    <p className="mt-1">{profile.username}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 sm:col-span-2">
                    <p className="text-xs uppercase text-slate-300">Bio</p>
                    <p className="mt-1">{profile.bio}</p>
                  </div>
                </div>
              )}
            </section>

            <PasswordSection onSubmitPassword={handleChangePassword} />
          </div>

          <div className="space-y-6">
            <AvatarUpload initialUrl={profile.avatarUrl} onUpload={handleUploadAvatar} />
          </div>
        </div>
      </div>
    </div>
  );
}
