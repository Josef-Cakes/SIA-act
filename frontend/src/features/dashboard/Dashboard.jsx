import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Boxes,
  Calendar,
  CheckCircle,
  Hash,
  LayoutDashboard,
  Leaf,
  Loader2,
  LogOut,
  Settings,
  TrendingUp,
  User,
} from 'lucide-react';
import Spinner from '../../components/Spinner';
import ToastMessage from '../../components/ToastMessage';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
 HEAD
import { buildBackendUrl } from '../../config/backendOrigin';
import { resolveBackendUrl } from '../../config/env';
origin/main
import { getProfilePhotoUrl } from '../auth/authService';
import { useAuth } from '../../context/AuthContext';
import { useLogoutAction } from '../auth/useLogout';
import { QUICK_ACTIONS, getActionConfig } from './dashboardActionConfig';
import { getDashboardStats, getRecentLogs, postLogAction } from './farmService';
import QuickActionModal from './QuickActionModal';
import RecentLogsPanel from './RecentLogsPanel';

const EMPTY_STATS = {
  totalLivestock: 0,
  activeBatchCount: 0,
  todayActionCount: 0,
  availableBatches: [],
};

function toTitleCase(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function resolveAvatarUrl(url) {
HEAD
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return buildBackendUrl(url);
  return resolveBackendUrl(url) || null;
origin/main
}

function getErrorMessage(error, fallbackMessage = 'Something went wrong.') {
  const status = error?.response?.status;
  if (status === 403) {
    return 'Permission Denied';
  }

  return error?.response?.data?.message || fallbackMessage;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isProfileLoading } = useAuth();
  const logout = useLogoutAction();
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(EMPTY_STATS);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedActionType, setSelectedActionType] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [actionForm, setActionForm] = useState({
    batchId: '',
    quantity: 1,
    remarks: '',
  });

  const userId = user?.id;
  const selectedAction = useMemo(
    () => (selectedActionType ? getActionConfig(selectedActionType) : null),
    [selectedActionType]
  );

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Profile', icon: User, path: '/user-management' },
    { label: 'Settings', icon: Settings, path: null },
  ];

  const refreshDashboardData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsDashboardLoading(true);
    }

    try {
      const [statsResponse, logsResponse] = await Promise.all([
        getDashboardStats(),
        getRecentLogs(),
      ]);

      if (statsResponse?.success && statsResponse?.data) {
        setDashboardStats({
          ...EMPTY_STATS,
          ...statsResponse.data,
          availableBatches: statsResponse.data.availableBatches || [],
        });
      } else {
        throw new Error(statsResponse?.message || 'Unable to load dashboard stats.');
      }

      if (logsResponse?.success && Array.isArray(logsResponse?.data)) {
        setRecentLogs(logsResponse.data);
      } else {
        throw new Error(logsResponse?.message || 'Unable to load recent logs.');
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: getErrorMessage(error, 'Unable to load dashboard data.'),
      });
    } finally {
      setIsDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void refreshDashboardData();
  }, [userId, refreshDashboardData]);

  const handleQuickAction = (actionType) => {
    if (!dashboardStats.availableBatches.length) {
      setToast({
        type: 'error',
        message: 'No active batches are available for quick actions yet.',
      });
      return;
    }

    setSelectedActionType(actionType);
    setActionForm({
      batchId: String(dashboardStats.availableBatches[0].id),
      quantity: 1,
      remarks: '',
    });
  };

  const handleActionFormChange = (event) => {
    const { name, value } = event.target;
    setActionForm((previous) => ({
      ...previous,
      [name]: name === 'quantity' ? Number(value) : value,
    }));
  };

  const closeActionModal = (force = false) => {
    if (isActionSubmitting && !force) {
      return;
    }

    setSelectedActionType(null);
    setActionForm({
      batchId: '',
      quantity: 1,
      remarks: '',
    });
  };

  const handleSubmitQuickAction = async (event) => {
    event.preventDefault();

    if (!selectedAction) {
      return;
    }

    setIsActionSubmitting(true);

    try {
      const response = await postLogAction({
        actionType: selectedAction.type,
        batchId: Number(actionForm.batchId),
        quantity: Number(actionForm.quantity),
        remarks: actionForm.remarks?.trim() || undefined,
      });

      if (!response?.success) {
        throw new Error(response?.message || `Unable to submit ${selectedAction.label.toLowerCase()}.`);
      }

      closeActionModal(true);
      await refreshDashboardData({ silent: true });
      setToast({
        type: 'success',
        message: `${selectedAction.label} logged successfully.`,
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: getErrorMessage(error, `Unable to submit ${selectedAction.label.toLowerCase()}.`),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-midnight-navy font-sans text-white px-4">
        <div className="inline-flex min-h-touch items-center gap-3 rounded-container border border-white/10 bg-deep-slate px-5 py-4 text-sm text-slate-caption shadow-card">
          <Spinner />
          {isProfileLoading ? 'Loading your account...' : 'Preparing your dashboard...'}
        </div>
      </div>
    );
  }

  const rawDisplayName = user.fullName || user.username || '';
  const displayName = toTitleCase(rawDisplayName);
  const welcomeMessage = displayName ? `Welcome back, ${displayName}!` : 'Welcome back!';
  const avatarUrl = resolveAvatarUrl(user?.profilePhotoUrl)
    || (user?.hasProfileImage ? getProfilePhotoUrl(user.id) : null);

  const statCards = [
    {
      label: 'Total Livestock',
      value: dashboardStats.totalLivestock.toLocaleString(),
      icon: Boxes,
      color: 'text-veridian-emerald',
      hint: 'Live count across all active batches',
    },
    {
      label: 'Active Batches',
      value: dashboardStats.activeBatchCount.toLocaleString(),
      icon: Hash,
      color: 'text-veridian-sky',
      hint: 'Batches available for quick action logging',
    },
    {
      label: 'Actions Today',
      value: dashboardStats.todayActionCount.toLocaleString(),
      icon: TrendingUp,
      color: 'text-veridian-amber',
      hint: 'Your logged farm actions in the last 24 hours',
    },
  ];

  return (
    <div className="min-h-screen flex bg-midnight-navy font-sans text-white">
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={logout}
      />
      {toast ? <ToastMessage type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
      <QuickActionModal
        action={selectedAction}
        batches={dashboardStats.availableBatches}
        formValues={actionForm}
        onClose={closeActionModal}
        onChange={handleActionFormChange}
        onSubmit={handleSubmitQuickAction}
        isSubmitting={isActionSubmitting}
      />

      <aside className="hidden w-56 flex-shrink-0 bg-deep-slate border-r border-white/10 md:flex md:flex-col md:p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 rounded-input bg-veridian-emerald flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-semibold text-white">Farm Ville</span>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path && location.pathname === item.path;
            return (
              <button
                type="button"
                key={item.label}
                onClick={() => {
                  if (item.path) {
                    navigate(item.path);
                    return;
                  }
                  setToast({
                    type: 'error',
                    message: 'Settings is not available yet.',
                  });
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-input text-sm font-medium transition-colors duration-200 min-h-touch ${
                  isActive
                    ? 'bg-veridian-emerald/15 text-veridian-emerald'
                    : 'text-slate-caption hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center gap-3 px-3 py-3 rounded-input text-sm font-medium text-slate-caption hover:bg-white/5 hover:text-white transition-colors duration-200 border border-white/10 mt-auto min-h-touch"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </aside>

      <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
            <p className="text-slate-caption text-sm mt-1">{welcomeMessage}</p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-container border border-white/10 bg-deep-slate px-4 py-3 sm:min-w-[260px]">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-caption">Signed In As</p>
              <p className="mt-1 text-sm font-semibold text-white">{displayName || user.username}</p>
            </div>
            <div className="h-12 w-12 overflow-hidden rounded-full bg-veridian-emerald flex items-center justify-center">
              {avatarUrl && !avatarLoadError ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                  onError={() => setAvatarLoadError(true)}
                />
              ) : (
                <span className="text-white font-semibold text-lg">
                  {(displayName || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </header>

        {isDashboardLoading ? (
          <div className="mb-8 flex items-center gap-3 rounded-container border border-white/10 bg-deep-slate px-4 py-3 text-sm text-slate-caption">
            <Spinner />
            Refreshing live dashboard data...
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <article
                key={stat.label}
                className="rounded-container border border-white/10 bg-deep-slate p-5 shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-caption">{stat.label}</p>
                    <p className={`mt-3 text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className="rounded-input bg-midnight-navy p-3">
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-caption">{stat.hint}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <article className="rounded-container border border-white/10 bg-deep-slate p-5 shadow-card">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">Quick Actions</h2>
                  <p className="text-sm text-slate-caption">
                    Submit a farm event and watch the cards and logs refresh immediately.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {QUICK_ACTIONS.map((action) => {
                  const { Icon } = action;
                  return (
                    <button
                      key={action.type}
                      type="button"
                      onClick={() => handleQuickAction(action.type)}
                      className={`min-h-[144px] rounded-container border bg-midnight-navy p-4 text-left transition-all duration-200 ${action.buttonClassName}`}
                    >
                      <div className={`mb-4 inline-flex rounded-input p-3 ${action.iconSurfaceClassName}`}>
                        <Icon className={`h-5 w-5 ${action.iconClassName}`} />
                      </div>
                      <p className="text-sm font-semibold text-white">{action.label}</p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-caption">{action.description}</p>
                    </button>
                  );
                })}
              </div>
            </article>

            <article className="rounded-container border border-white/10 bg-deep-slate p-5 shadow-card">
              <h2 className="text-base font-semibold text-white">Profile Snapshot</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  { label: 'Account Status', value: 'Active', icon: CheckCircle, color: 'text-veridian-emerald' },
                  { label: 'User ID', value: `#${user.id}`, icon: Hash, color: 'text-veridian-sky' },
                  {
                    label: 'Member Since',
                    value: user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      : 'Today',
                    icon: Calendar,
                    color: 'text-veridian-amber',
                  },
                  { label: 'Available Batches', value: dashboardStats.availableBatches.length, icon: Boxes, color: 'text-veridian-emerald' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-input border border-white/10 bg-midnight-navy p-4">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${item.color}`} />
                        <div>
                          <p className="text-xs text-slate-caption">{item.label}</p>
                          <p className={`mt-1 text-sm font-semibold ${item.color}`}>{item.value}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>

          <RecentLogsPanel recentLogs={recentLogs} />
        </section>
      </main>
    </div>
  );
}
