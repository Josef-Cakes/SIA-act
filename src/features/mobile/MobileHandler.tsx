import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  HandCoins,
  LogOut,
  Package,
  Pill,
  RefreshCw,
  ScanLine,
  Skull,
  TriangleAlert,
  User,
  UtensilsCrossed,
  Wifi,
  WifiOff,
} from 'lucide-react';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
import Spinner from '../../components/Spinner';
import { resolveBackendUrl } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { useFarmData, useLivestockBatches } from '../../context/FarmDataContext';
import { getProfilePhotoUrl } from '../auth/authService';
import { useLogoutAction } from '../auth/useLogout';
import {
  createInventoryBatch,
  createLivestockSpecies,
  postLogAction,
} from '../dashboard/farmService';

type MobileView =
  | 'dashboard'
  | 'feeding'
  | 'mortality'
  | 'medicine'
  | 'sales'
  | 'scanner'
  | 'livestock'
  | 'batches'
  | 'create-livestock'
  | 'create-batch';

type FeedStep = 1 | 2 | 3;
type DetailStep = 1 | 2;
type SalesStep = 1 | 2;
type CreateOrigin = 'inventory' | 'feeding';
type ToastState = { type: 'success' | 'error'; message: string } | null;
type SuccessState = { title: string; message: string } | null;
type SuccessCallback = (() => void | Promise<void>) | null;
type ScannerStatus = 'searching' | 'detected';

interface DashboardBatchOption {
  id: number;
  name: string;
  livestockType: string;
  currentCount: number;
}

interface DashboardRecentLog {
  id: number;
  actionType: string;
  batchId: number;
  batchName?: string;
  quantity: number;
  remarks?: string;
  timestamp: string;
}

interface LivestockSummary {
  id: number;
  type: string;
  batchCount: number;
  totalCurrentCount: number;
}

interface InventoryBatch {
  id: number;
  livestockId: number;
  livestockType: string;
  name: string;
  breed?: string;
  initialCount: number;
  currentCount: number;
  arrivalDate?: string;
  ageInDays: number;
}

interface FeedingFormState {
  batchId: string;
  feedType: string;
  weight: string;
  notes: string;
}

interface DetailFormState {
  batchId: string;
  quantity: string;
  detailType: string;
  notes: string;
}

interface SalesFormState {
  batchId: string;
  customerName: string;
  unitPrice: string;
  quantity: string;
  notes: string;
}

interface CreateLivestockFormState {
  type: string;
}

interface CreateBatchFormState {
  livestockId: string;
  name: string;
  initialCount: string;
  breed: string;
  arrivalDate: string;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  accentClassName: string;
}

interface ActionCardProps {
  title: string;
  caption: string;
  icon: ReactNode;
  surfaceClassName: string;
  disabled?: boolean;
  onClick: () => void;
}

const FEED_TYPES = [
  {
    value: 'starter',
    label: 'Starter Feed',
    hint: 'For younger stock and early growth cycles.',
    className: 'border-veridian-sky/30 bg-veridian-sky/10 text-veridian-sky',
  },
  {
    value: 'grower',
    label: 'Grower Feed',
    hint: 'Balanced daily feed for active batches.',
    className: 'border-veridian-emerald/30 bg-veridian-emerald/10 text-veridian-emerald',
  },
  {
    value: 'finisher',
    label: 'Finisher Feed',
    hint: 'For later-stage growth and weight gain.',
    className: 'border-veridian-amber/30 bg-veridian-amber/10 text-veridian-amber',
  },
];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function createFeedingForm(batchId = ''): FeedingFormState {
  return {
    batchId,
    feedType: FEED_TYPES[0].value,
    weight: '',
    notes: '',
  };
}

function createDetailForm(batchId = ''): DetailFormState {
  return {
    batchId,
    quantity: '1',
    detailType: '',
    notes: '',
  };
}

function createSalesForm(batchId = ''): SalesFormState {
  return {
    batchId,
    customerName: '',
    unitPrice: '',
    quantity: '1',
    notes: '',
  };
}

function createInitialLivestockForm(): CreateLivestockFormState {
  return { type: '' };
}

function createInitialBatchForm(livestockId = ''): CreateBatchFormState {
  return {
    livestockId,
    name: '',
    initialCount: '',
    breed: '',
    arrivalDate: todayIsoDate(),
  };
}

function resolveAvatarUrl(url?: string | null) {
  return resolveBackendUrl(url || undefined) || null;
}

function getFirstName(fullName?: string | null, fallback = 'Handler') {
  if (!fullName) return fallback;
  const trimmed = fullName.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0];
}

function getGreetingByTime() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function formatTimeAgo(timestamp?: string | Date | null) {
  if (!timestamp) return 'Just now';
  const normalizedTimestamp = typeof timestamp === 'string' && !timestamp.endsWith('Z') ? `${timestamp}Z` : timestamp;
  const parsed = normalizedTimestamp instanceof Date ? normalizedTimestamp : new Date(normalizedTimestamp);
  if (Number.isNaN(parsed.getTime())) return 'Just now';

  const diffMinutes = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function formatCurrency(amount: number) {
  if (!Number.isFinite(amount)) return '0.00';
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatAge(ageInDays?: number) {
  if (!Number.isFinite(ageInDays)) return 'Age unavailable';
  if (ageInDays === 0) return 'Arrived today';
  if (ageInDays < 7) return `${ageInDays} day${ageInDays === 1 ? '' : 's'} old`;
  const weeks = Math.floor(ageInDays / 7);
  if (weeks < 8) return `${weeks} week${weeks === 1 ? '' : 's'} old`;
  const months = Math.floor(ageInDays / 30);
  return `${months} month${months === 1 ? '' : 's'} old`;
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  const response = typeof error === 'object' && error !== null ? Reflect.get(error, 'response') : undefined;
  const responseStatus = typeof response === 'object' && response !== null ? Reflect.get(response, 'status') : undefined;
  const responseData = typeof response === 'object' && response !== null ? Reflect.get(response, 'data') : undefined;

  if (responseStatus === 403) {
    return 'Permission Denied';
  }

  if (typeof responseData === 'object' && responseData !== null) {
    const message = Reflect.get(responseData, 'message');
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function buildRemarks(parts: Array<string | undefined>) {
  return parts
    .map((part) => (part ? part.trim() : ''))
    .filter(Boolean)
    .join(' | ');
}

function getLogPresentation(actionType: string) {
  switch (actionType) {
    case 'MORTALITY':
      return {
        label: 'Mortality',
        Icon: Skull,
        iconClassName: 'text-veridian-rose',
        surfaceClassName: 'bg-veridian-rose/15',
      };
    case 'VACCINATION':
      return {
        label: 'Medicine',
        Icon: Pill,
        iconClassName: 'text-veridian-amber',
        surfaceClassName: 'bg-veridian-amber/15',
      };
    case 'SALE':
      return {
        label: 'Sale',
        Icon: HandCoins,
        iconClassName: 'text-veridian-sky',
        surfaceClassName: 'bg-veridian-sky/15',
      };
    case 'FEEDING':
    default:
      return {
        label: 'Feeding',
        Icon: UtensilsCrossed,
        iconClassName: 'text-veridian-emerald',
        surfaceClassName: 'bg-veridian-emerald/15',
      };
  }
}

function getRecentLogSummary(log: DashboardRecentLog) {
  const batchName = log.batchName || `Batch #${log.batchId}`;

  switch (log.actionType) {
    case 'MORTALITY':
      return `Mortality: ${batchName} x${log.quantity}`;
    case 'VACCINATION':
      return `Medicine: ${batchName} x${log.quantity}`;
    case 'SALE':
      return `Sold: ${batchName} x${log.quantity}`;
    case 'FEEDING':
    default:
      return `Feeding: ${batchName} x${log.quantity}`;
  }
}

function MetricCard({ label, value, icon, accentClassName }: MetricCardProps) {
  return (
    <article className="rounded-[22px] border border-white/10 bg-white/5 px-3 py-3 shadow-card backdrop-blur-sm">
      <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-2xl ${accentClassName}`}>
        {icon}
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-caption">{label}</p>
    </article>
  );
}

function ActionCard({ title, caption, icon, surfaceClassName, disabled = false, onClick }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[132px] rounded-[24px] p-4 text-left shadow-card transition-all duration-200 ${
        disabled
          ? 'cursor-not-allowed opacity-50 saturate-50'
          : 'hover:-translate-y-0.5'
      } ${surfaceClassName}`}
    >
      <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/15">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-white/75">{caption}</p>
    </button>
  );
}

function BatchPicker({
  batches,
  selectedBatchId,
  onSelect,
}: {
  batches: DashboardBatchOption[];
  selectedBatchId: string;
  onSelect: (batchId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {batches.map((batch) => {
        const isSelected = String(batch.id) === selectedBatchId;

        return (
          <button
            key={batch.id}
            type="button"
            onClick={() => onSelect(String(batch.id))}
            className={`w-full rounded-[24px] border px-4 py-4 text-left transition-colors ${
              isSelected
                ? 'border-veridian-emerald bg-veridian-emerald/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-white">{batch.name}</p>
                <p className="mt-1 text-sm text-slate-caption">{batch.livestockType}</p>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                {batch.currentCount} heads
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function MobileHandler() {
  const navigate = useNavigate();
  const { user, syncStatus } = useAuth();
  const logout = useLogoutAction();
  const {
    stats: dashboardStats,
    batches: availableBatches,
    recentLogs,
    livestock: livestockList,
    isBootstrapping,
    isRefreshing,
    refreshFarmData,
    invalidateFarmData,
  } = useFarmData();
  const [activeView, setActiveView] = useState<MobileView>('dashboard');
  const [feedingStep, setFeedingStep] = useState<FeedStep>(1);
  const [detailStep, setDetailStep] = useState<DetailStep>(1);
  const [salesStep, setSalesStep] = useState<SalesStep>(1);
  const [selectedLivestock, setSelectedLivestock] = useState<LivestockSummary | null>(null);
  const [feedingForm, setFeedingForm] = useState<FeedingFormState>(createFeedingForm());
  const [detailForm, setDetailForm] = useState<DetailFormState>(createDetailForm());
  const [salesForm, setSalesForm] = useState<SalesFormState>(createSalesForm());
  const [createLivestockForm, setCreateLivestockForm] = useState<CreateLivestockFormState>(createInitialLivestockForm());
  const [createBatchForm, setCreateBatchForm] = useState<CreateBatchFormState>(createInitialBatchForm());
  const [createLivestockOrigin, setCreateLivestockOrigin] = useState<CreateOrigin>('inventory');
  const [createBatchOrigin, setCreateBatchOrigin] = useState<CreateOrigin>('inventory');
  const [pendingCreateBatchAfterLivestock, setPendingCreateBatchAfterLivestock] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [successState, setSuccessState] = useState<SuccessState>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('searching');
  const [scannedBatchId, setScannedBatchId] = useState<string>('');
  const successTimeoutRef = useRef<number | null>(null);
  const scannerDetectTimeoutRef = useRef<number | null>(null);
  const scannerRedirectTimeoutRef = useRef<number | null>(null);
  const successCallbackRef = useRef<SuccessCallback>(null);

  const {
    data: inventoryBatches = [],
    isLoading: isInventoryBatchesLoading,
  } = useLivestockBatches(selectedLivestock?.id ?? null, 'handler');
  const logActionMutation = useMutation({
    mutationFn: postLogAction,
    onSuccess: async () => {
      await invalidateFarmData();
    },
  });
  const createLivestockMutation = useMutation({
    mutationFn: createLivestockSpecies,
    onSuccess: async () => {
      await invalidateFarmData();
    },
  });
  const createBatchMutation = useMutation({
    mutationFn: createInventoryBatch,
    onSuccess: async () => {
      await invalidateFarmData();
    },
  });
  const isSubmitting = logActionMutation.isPending || createLivestockMutation.isPending || createBatchMutation.isPending;
  const isLoading = isBootstrapping;
  const isInventoryLoading = isRefreshing || isInventoryBatchesLoading;
  const firstBatchId = availableBatches.length ? String(availableBatches[0].id) : '';
  const firstLivestockId = livestockList.length ? String(livestockList[0].id) : '';
  const displayName = getFirstName(user?.fullName || user?.username);
  const greeting = `${getGreetingByTime()}, ${displayName}`;
  const avatarUrl = resolveAvatarUrl(user?.profilePhotoUrl)
    || (user?.hasProfileImage && user?.id ? getProfilePhotoUrl(user.id) : null);
  const hasAvailableBatches = availableBatches.length > 0;
  const lastSyncedAt = syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt) : null;

  const selectedFeedingBatch = useMemo(
    () => availableBatches.find((batch) => String(batch.id) === feedingForm.batchId) || null,
    [availableBatches, feedingForm.batchId]
  );

  const selectedDetailBatch = useMemo(
    () => availableBatches.find((batch) => String(batch.id) === detailForm.batchId) || null,
    [availableBatches, detailForm.batchId]
  );

  const selectedSalesBatch = useMemo(
    () => availableBatches.find((batch) => String(batch.id) === salesForm.batchId) || null,
    [availableBatches, salesForm.batchId]
  );

  const scannedBatch = useMemo(
    () => availableBatches.find((batch) => String(batch.id) === scannedBatchId) || null,
    [availableBatches, scannedBatchId]
  );

  const alertCount = useMemo(
    () => recentLogs.filter((log) => log.actionType === 'MORTALITY').length,
    [recentLogs]
  );

  const salesTotalAmount = useMemo(() => {
    const quantity = Number(salesForm.quantity);
    const unitPrice = Number(salesForm.unitPrice);

    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      return 0;
    }

    return quantity * unitPrice;
  }, [salesForm.quantity, salesForm.unitPrice]);

  const currentFlowTitle = activeView === 'feeding'
    ? 'Log Feeding'
    : activeView === 'mortality'
      ? 'Log Mortality'
      : activeView === 'medicine'
        ? 'Log Medicine'
        : activeView === 'sales'
          ? 'Log Sale'
          : activeView === 'scanner'
            ? 'Scan QR'
            : activeView === 'livestock'
              ? 'Livestock Inventory'
              : activeView === 'batches'
                ? `${selectedLivestock?.type || 'Livestock'} Batches`
                : activeView === 'create-livestock'
                  ? 'Add Livestock'
                  : 'Create Batch';

  const clearScannerTimers = useCallback(() => {
    if (scannerDetectTimeoutRef.current) {
      window.clearTimeout(scannerDetectTimeoutRef.current);
      scannerDetectTimeoutRef.current = null;
    }
    if (scannerRedirectTimeoutRef.current) {
      window.clearTimeout(scannerRedirectTimeoutRef.current);
      scannerRedirectTimeoutRef.current = null;
    }
  }, []);

  const loadBatchesForLivestock = useCallback((livestock: LivestockSummary) => {
    setActiveView('batches');
    setSelectedLivestock(livestock);
  }, []);

  const resetNavigationState = useCallback(() => {
    clearScannerTimers();
    setActiveView('dashboard');
    setFeedingStep(1);
    setDetailStep(1);
    setSalesStep(1);
    setSelectedLivestock(null);
    setFeedingForm(createFeedingForm(firstBatchId));
    setDetailForm(createDetailForm(firstBatchId));
    setSalesForm(createSalesForm(firstBatchId));
    setCreateLivestockForm(createInitialLivestockForm());
    setCreateBatchForm(createInitialBatchForm(firstLivestockId));
    setCreateLivestockOrigin('inventory');
    setCreateBatchOrigin('inventory');
    setPendingCreateBatchAfterLivestock(false);
    setScannerStatus('searching');
    setScannedBatchId('');
  }, [clearScannerTimers, firstBatchId, firstLivestockId]);

  const showSuccessOverlay = useCallback((title: string, message: string, onComplete?: SuccessCallback) => {
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }

    successCallbackRef.current = onComplete || (() => resetNavigationState());
    setSuccessState({ title, message });

    successTimeoutRef.current = window.setTimeout(() => {
      setSuccessState(null);
      const callback = successCallbackRef.current;
      successCallbackRef.current = null;
      void callback?.();
    }, 2000);
  }, [resetNavigationState]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
      clearScannerTimers();
    };
  }, [clearScannerTimers]);

  useEffect(() => {
    if (!user?.id) {
      navigate('/login');
      return;
    }
  }, [navigate, user?.id]);

  useEffect(() => {
    if (!selectedLivestock?.id) {
      return;
    }

    const matchingLivestock = livestockList.find((item) => item.id === selectedLivestock.id) || null;
    if (!matchingLivestock) {
      setSelectedLivestock(null);
      if (activeView === 'batches') {
        setActiveView('livestock');
      }
      return;
    }

    if (matchingLivestock !== selectedLivestock) {
      setSelectedLivestock(matchingLivestock);
    }
  }, [activeView, livestockList, selectedLivestock]);

  useEffect(() => {
    if (activeView !== 'scanner' || !hasAvailableBatches) {
      return undefined;
    }

    clearScannerTimers();
    setScannerStatus('searching');
    setScannedBatchId('');

    const detectedBatch = availableBatches[0];
    scannerDetectTimeoutRef.current = window.setTimeout(() => {
      setScannerStatus('detected');
      setScannedBatchId(String(detectedBatch.id));
    }, 1400);

    scannerRedirectTimeoutRef.current = window.setTimeout(() => {
      setFeedingForm(createFeedingForm(String(detectedBatch.id)));
      setFeedingStep(2);
      setActiveView('feeding');
      setToast({
        type: 'success',
        message: `${detectedBatch.name} detected. Continue the feeding log below.`,
      });
    }, 2500);

    return () => {
      clearScannerTimers();
    };
  }, [activeView, availableBatches, clearScannerTimers, hasAvailableBatches]);

  const openInventoryFlow = () => {
    setActiveView('livestock');
  };

  const openCreateLivestockFlow = (origin: CreateOrigin, continueToCreateBatch = false) => {
    setCreateLivestockOrigin(origin);
    setPendingCreateBatchAfterLivestock(continueToCreateBatch);
    setCreateLivestockForm(createInitialLivestockForm());
    setActiveView('create-livestock');
  };

  const openCreateBatchFlow = (origin: CreateOrigin, livestockId?: string) => {
    if (!livestockList.length) {
      setToast({
        type: 'error',
        message: 'Add livestock to start by creating a species first.',
      });
      openCreateLivestockFlow(origin, true);
      return;
    }

    const targetLivestockId = livestockId || (selectedLivestock ? String(selectedLivestock.id) : firstLivestockId);
    setCreateBatchOrigin(origin);
    setCreateBatchForm(createInitialBatchForm(targetLivestockId));
    setActiveView('create-batch');
  };

  const openFeedingFlow = () => {
    if (!hasAvailableBatches) return;
    setFeedingForm(createFeedingForm(firstBatchId));
    setFeedingStep(1);
    setActiveView('feeding');
  };

  const openDetailFlow = (view: 'mortality' | 'medicine') => {
    if (!hasAvailableBatches) return;
    setDetailForm(createDetailForm(firstBatchId));
    setDetailStep(1);
    setActiveView(view);
  };

  const openSalesFlow = () => {
    if (!hasAvailableBatches) return;
    setSalesForm(createSalesForm(firstBatchId));
    setSalesStep(1);
    setActiveView('sales');
  };

  const openScannerFlow = () => {
    if (!hasAvailableBatches) return;
    setActiveView('scanner');
  };

  const handleBack = () => {
    if (activeView === 'feeding') {
      if (feedingStep === 3) {
        setFeedingStep(2);
        return;
      }
      if (feedingStep === 2) {
        setFeedingStep(1);
        return;
      }
    }

    if ((activeView === 'mortality' || activeView === 'medicine') && detailStep === 2) {
      setDetailStep(1);
      return;
    }

    if (activeView === 'sales' && salesStep === 2) {
      setSalesStep(1);
      return;
    }

    if (activeView === 'batches') {
      setActiveView('livestock');
      return;
    }

    if (activeView === 'create-livestock') {
      if (createLivestockOrigin === 'feeding') {
        setActiveView('feeding');
        setFeedingStep(1);
        return;
      }
      setActiveView('livestock');
      return;
    }

    if (activeView === 'create-batch') {
      if (createBatchOrigin === 'feeding') {
        setActiveView('feeding');
        setFeedingStep(1);
        return;
      }
      setActiveView(selectedLivestock ? 'batches' : 'livestock');
      return;
    }

    resetNavigationState();
  };

  const handleSubmitAction = async (payload: {
    actionType: string;
    batchId: number;
    quantity: number;
    remarks?: string;
    customerName?: string;
    unitPrice?: number;
    successTitle: string;
    successMessage: string;
  }) => {
    try {
      const response = await logActionMutation.mutateAsync({
        actionType: payload.actionType,
        batchId: payload.batchId,
        quantity: payload.quantity,
        remarks: payload.remarks,
        customerName: payload.customerName,
        unitPrice: payload.unitPrice,
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Unable to submit the action.');
      }

      showSuccessOverlay(payload.successTitle, payload.successMessage);
    } catch (error) {
      setToast({
        type: 'error',
        message: getErrorMessage(error, 'Unable to submit the action.'),
      });
    }
  };

  const handleSubmitFeeding = async () => {
    if (!selectedFeedingBatch) {
      setToast({ type: 'error', message: 'Choose a batch before submitting.' });
      return;
    }

    const weight = Number(feedingForm.weight);
    if (!Number.isFinite(weight) || weight <= 0) {
      setToast({ type: 'error', message: 'Enter a valid feed weight.' });
      return;
    }

    const selectedFeedType = FEED_TYPES.find((type) => type.value === feedingForm.feedType)?.label || 'Feed';

    await handleSubmitAction({
      actionType: 'FEEDING',
      batchId: selectedFeedingBatch.id,
      quantity: weight,
      remarks: buildRemarks([`Feed Type: ${selectedFeedType}`, feedingForm.notes]) || undefined,
      successTitle: 'Feeding Logged',
      successMessage: `${selectedFeedType} recorded for ${selectedFeedingBatch.name}.`,
    });
  };

  const handleSubmitDetail = async () => {
    if (!selectedDetailBatch) {
      setToast({ type: 'error', message: 'Choose a batch before submitting.' });
      return;
    }

    const quantity = Number(detailForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setToast({ type: 'error', message: 'Enter a valid quantity.' });
      return;
    }

    const isMedicine = activeView === 'medicine';
    const detailLabel = isMedicine ? 'Medicine Type' : 'Reason';
    const detailValue = detailForm.detailType.trim();

    if (!detailValue) {
      setToast({
        type: 'error',
        message: isMedicine ? 'Enter the medicine type.' : 'Enter the mortality reason.',
      });
      return;
    }

    await handleSubmitAction({
      actionType: isMedicine ? 'VACCINATION' : 'MORTALITY',
      batchId: selectedDetailBatch.id,
      quantity,
      remarks: buildRemarks([`${detailLabel}: ${detailValue}`, detailForm.notes]) || undefined,
      successTitle: isMedicine ? 'Medicine Logged' : 'Mortality Logged',
      successMessage: isMedicine
        ? `${detailValue} recorded for ${selectedDetailBatch.name}.`
        : `${quantity} head recorded for ${selectedDetailBatch.name}.`,
    });
  };

  const handleSubmitSale = async () => {
    if (!selectedSalesBatch) {
      setToast({ type: 'error', message: 'Choose a batch before submitting.' });
      return;
    }

    const quantity = Number(salesForm.quantity);
    const unitPrice = Number(salesForm.unitPrice);
    const customerName = salesForm.customerName.trim();

    if (!customerName) {
      setToast({ type: 'error', message: 'Enter the customer name.' });
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setToast({ type: 'error', message: 'Enter a valid quantity.' });
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setToast({ type: 'error', message: 'Enter a valid price per unit.' });
      return;
    }

    await handleSubmitAction({
      actionType: 'SALE',
      batchId: selectedSalesBatch.id,
      quantity,
      unitPrice,
      customerName,
      remarks: salesForm.notes.trim() || undefined,
      successTitle: 'Sale Logged',
      successMessage: `${customerName} purchase recorded for ${selectedSalesBatch.name}.`,
    });
  };

  const handleCreateLivestock = async () => {
    const type = createLivestockForm.type.trim();
    if (!type) {
      setToast({ type: 'error', message: 'Enter a livestock species name.' });
      return;
    }

    try {
      const response = await createLivestockMutation.mutateAsync({ type });
      if (!response?.success || !response?.data) {
        throw new Error(response?.message || 'Unable to create the livestock species.');
      }

      const createdLivestock = response.data as LivestockSummary;

      if (pendingCreateBatchAfterLivestock) {
        showSuccessOverlay(
          'Livestock Added',
          `${createdLivestock.type} is ready for its first batch.`,
          async () => {
            setPendingCreateBatchAfterLivestock(false);
            setCreateLivestockForm(createInitialLivestockForm());
            setSelectedLivestock(createdLivestock);
            setCreateBatchOrigin(createLivestockOrigin);
            setCreateBatchForm(createInitialBatchForm(String(createdLivestock.id)));
            setActiveView('create-batch');
          }
        );
      } else {
        showSuccessOverlay(
          'Livestock Added',
          `${createdLivestock.type} was added to the inventory list.`,
          async () => {
            setCreateLivestockForm(createInitialLivestockForm());
            setActiveView('livestock');
          }
        );
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: getErrorMessage(error, 'Unable to create the livestock species.'),
      });
    }
  };

  const handleCreateBatch = async () => {
    const livestockId = Number(createBatchForm.livestockId);
    const initialCount = Number(createBatchForm.initialCount);

    if (!Number.isFinite(livestockId) || livestockId <= 0) {
      setToast({ type: 'error', message: 'Select a livestock species first.' });
      return;
    }
    if (!createBatchForm.name.trim()) {
      setToast({ type: 'error', message: 'Enter a batch name.' });
      return;
    }
    if (!Number.isFinite(initialCount) || initialCount <= 0) {
      setToast({ type: 'error', message: 'Enter a valid initial head count.' });
      return;
    }
    if (!createBatchForm.arrivalDate) {
      setToast({ type: 'error', message: 'Choose an arrival date.' });
      return;
    }

    try {
      const response = await createBatchMutation.mutateAsync({
        livestockId,
        name: createBatchForm.name.trim(),
        initialCount,
        breed: createBatchForm.breed.trim() || undefined,
        arrivalDate: createBatchForm.arrivalDate,
      });

      if (!response?.success || !response?.data) {
        throw new Error(response?.message || 'Unable to create the batch.');
      }

      const createdBatch = response.data as InventoryBatch;

      const matchingLivestock = livestockList.find((item) => item.id === createdBatch.livestockId)
        || selectedLivestock
        || null;

      showSuccessOverlay(
        'Batch Created',
        `${createdBatch.name} with ${createdBatch.initialCount} head is now active.`,
        async () => {
          setCreateBatchForm(createInitialBatchForm(String(createdBatch.livestockId)));
          if (createBatchOrigin === 'feeding') {
            setFeedingForm(createFeedingForm(String(createdBatch.id)));
            setFeedingStep(2);
            setActiveView('feeding');
            return;
          }

          if (matchingLivestock) {
            setSelectedLivestock(matchingLivestock);
          }
          setActiveView('batches');
        }
      );
    } catch (error) {
      setToast({
        type: 'error',
        message: getErrorMessage(error, 'Unable to create the batch.'),
      });
    }
  };

  if (!user) {
    return null;
  }

  const isFeedingStepTwoValid = Number(feedingForm.weight) > 0 && Boolean(feedingForm.feedType);
  const isDetailStepTwoValid = Number(detailForm.quantity) > 0 && Boolean(detailForm.detailType.trim());
  const isSalesStepTwoValid = Boolean(salesForm.customerName.trim())
    && Number(salesForm.quantity) > 0
    && Number(salesForm.unitPrice) > 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0F172A_35%,_#020617_100%)] px-3 py-3 sm:px-6 sm:py-8">
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={logout}
      />
      <div className="mx-auto w-full max-w-[430px]">
        <div className="relative h-[calc(100vh-1.5rem)] overflow-hidden bg-midnight-navy sm:h-[min(920px,calc(100vh-4rem))] sm:rounded-[34px] sm:border sm:border-white/10 sm:shadow-[0_30px_90px_rgba(2,6,23,0.6)]">
          {toast ? (
            <div
              className={`absolute inset-x-4 top-4 z-50 rounded-[20px] border px-4 py-3 text-sm shadow-card animate-fade-in ${
                toast.type === 'success'
                  ? 'border-veridian-emerald/30 bg-veridian-emerald/15 text-veridian-emerald'
                  : 'border-veridian-rose/30 bg-veridian-rose/15 text-veridian-rose'
              }`}
              role="status"
              aria-live="polite"
            >
              {toast.message}
            </div>
          ) : null}

          {successState ? (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-veridian-emerald px-8 text-center text-white">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/20">
                <CheckCircle2 className="h-14 w-14" />
              </div>
              <h2 className="text-3xl font-semibold">{successState.title}</h2>
              <p className="mt-3 max-w-[260px] text-sm text-white/85">{successState.message}</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-sm text-slate-caption">Syncing field handler dashboard...</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="bg-[#1E293B] text-white">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                  <div className="flex items-center gap-2">
                    {syncStatus.state === 'synced' && lastSyncedAt ? (
                      <Wifi className="h-3.5 w-3.5 text-veridian-emerald" />
                    ) : (
                      <WifiOff className="h-3.5 w-3.5 text-veridian-amber" />
                    )}
                    <span>
                      {isRefreshing
                        ? 'Syncing now'
                        : syncStatus.state === 'error'
                          ? 'Sync delayed'
                        : lastSyncedAt
                          ? `Synced ${formatTimeAgo(lastSyncedAt)}`
                          : 'Waiting for first sync'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshFarmData()}
                    className="inline-flex min-h-touch items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/80 transition-colors hover:bg-white/10"
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                </div>

                {activeView === 'dashboard' ? (
                  <div className="flex items-center justify-between px-4 pb-5 pt-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Field Handler</p>
                      <h1 className="mt-1 text-2xl font-semibold text-white">{greeting}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowLogoutModal(true)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="Log out"
                      >
                        <LogOut className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 pb-4 pt-4">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
                      aria-label="Go back"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Handler Workflow</p>
                      <h2 className="mt-1 text-xl font-semibold text-white">{currentFlowTitle}</h2>
                    </div>
                  </div>
                )}
              </div>

              {activeView === 'dashboard' ? (
                <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
                  <section className="grid grid-cols-3 gap-2">
                    <MetricCard
                      label="Today's Logs"
                      value={String(dashboardStats.todayActionCount)}
                      icon={<UtensilsCrossed className="h-5 w-5 text-veridian-emerald" />}
                      accentClassName="bg-veridian-emerald/15"
                    />
                    <MetricCard
                      label="Active Batches"
                      value={String(dashboardStats.activeBatchCount)}
                      icon={<Package className="h-5 w-5 text-veridian-sky" />}
                      accentClassName="bg-veridian-sky/15"
                    />
                    <MetricCard
                      label="Alerts"
                      value={String(alertCount)}
                      icon={<TriangleAlert className="h-5 w-5 text-veridian-rose" />}
                      accentClassName="bg-veridian-rose/15"
                    />
                  </section>

                  <button
                    type="button"
                    onClick={() => void openInventoryFlow()}
                    className="mt-5 flex min-h-touch w-full items-center justify-between rounded-[24px] border border-veridian-sky/30 bg-veridian-sky/10 px-4 py-4 text-left text-white shadow-card transition-colors hover:bg-veridian-sky/15"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-veridian-sky/20">
                        <Package className="h-6 w-6 text-veridian-sky" />
                      </div>
                      <div>
                        <p className="text-base font-semibold">Livestock Inventory</p>
                        <p className="mt-1 text-sm text-slate-200">Add species, create batches, and prepare actions.</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </button>

                  <section className="mt-5">
                    <div className="mb-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-caption">Quick Actions</p>
                      <h2 className="mt-1 text-lg font-semibold text-white">Log work in the field</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <ActionCard
                        title="Feeding"
                        caption="3-step feed log"
                        icon={<UtensilsCrossed className="h-6 w-6 text-white" />}
                        surfaceClassName="bg-gradient-to-br from-veridian-emerald to-emerald-700"
                        disabled={!hasAvailableBatches}
                        onClick={openFeedingFlow}
                      />
                      <ActionCard
                        title="Mortality"
                        caption="Quantity and reason"
                        icon={<Skull className="h-6 w-6 text-white" />}
                        surfaceClassName="bg-gradient-to-br from-veridian-rose to-rose-700"
                        disabled={!hasAvailableBatches}
                        onClick={() => openDetailFlow('mortality')}
                      />
                      <ActionCard
                        title="Medicine"
                        caption="Dosage and type"
                        icon={<Pill className="h-6 w-6 text-white" />}
                        surfaceClassName="bg-gradient-to-br from-veridian-amber to-orange-600"
                        disabled={!hasAvailableBatches}
                        onClick={() => openDetailFlow('medicine')}
                      />
                      <ActionCard
                        title="Sales"
                        caption="Customer and pricing"
                        icon={<HandCoins className="h-6 w-6 text-white" />}
                        surfaceClassName="bg-gradient-to-br from-veridian-sky to-blue-700"
                        disabled={!hasAvailableBatches}
                        onClick={openSalesFlow}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={openScannerFlow}
                      disabled={!hasAvailableBatches}
                      className={`mt-3 flex min-h-touch w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left transition-colors ${
                        hasAvailableBatches
                          ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                          : 'cursor-not-allowed border-white/10 bg-white/5 text-white opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/10">
                          <ScanLine className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Scan QR</p>
                          <p className="mt-0.5 text-xs text-slate-caption">Simulate a batch scan and jump to Feeding.</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300" />
                    </button>

                    {!hasAvailableBatches ? (
                      <div className="mt-3 rounded-[20px] border border-dashed border-veridian-amber/30 bg-veridian-amber/10 px-4 py-3 text-sm text-veridian-amber">
                        Add Livestock to start. Create a species and batch inside Livestock Inventory, then the action buttons will unlock.
                      </div>
                    ) : null}
                  </section>

                  <section className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-card">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-caption">Recent Logs</p>
                        <h2 className="mt-1 text-lg font-semibold text-white">Latest field activity</h2>
                      </div>
                      {isRefreshing ? <Spinner size="sm" /> : null}
                    </div>

                    {recentLogs.length === 0 ? (
                      <div className="rounded-[20px] border border-dashed border-white/10 bg-midnight-navy/80 px-4 py-6 text-center text-sm text-slate-caption">
                        No logs yet. Submit a quick action and it will appear here instantly.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentLogs.slice(0, 5).map((log) => {
                          const presentation = getLogPresentation(log.actionType);
                          const Icon = presentation.Icon;

                          return (
                            <article
                              key={log.id}
                              className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-midnight-navy/80 px-3.5 py-3"
                            >
                              <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[16px] ${presentation.surfaceClassName}`}>
                                <Icon className={`h-5 w-5 ${presentation.iconClassName}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-white">{presentation.label}</p>
                                  <span className="text-xs text-slate-caption">{formatTimeAgo(log.timestamp)}</span>
                                </div>
                                <p className="mt-1 text-sm text-slate-200">{getRecentLogSummary(log)}</p>
                                {log.remarks ? (
                                  <p className="mt-1 break-words text-xs text-slate-caption">{log.remarks}</p>
                                ) : null}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              ) : null}

              {activeView === 'scanner' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 overflow-y-auto px-4 py-5">
                    <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-caption">Scanner Simulation</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">Finding a nearby batch tag</h3>
                      <p className="mt-2 text-sm text-slate-caption">
                        This simulates the camera flow on web, then drops you into Feeding for the detected batch.
                      </p>
                    </div>

                    <div className="relative mt-5 overflow-hidden rounded-[30px] border border-veridian-sky/30 bg-[linear-gradient(180deg,_rgba(2,6,23,0.88)_0%,_rgba(14,165,233,0.08)_100%)] p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                          <Camera className="h-4 w-4" />
                          Web Camera Preview
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                          <ScanLine className={`h-4 w-4 ${scannerStatus === 'searching' ? 'animate-pulse' : ''}`} />
                          {scannerStatus === 'searching' ? 'Scanning...' : 'Tag detected'}
                        </div>
                      </div>

                      <div className="relative flex h-[340px] items-center justify-center rounded-[24px] border border-veridian-sky/20 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.18),_rgba(2,6,23,0.9)_60%)]">
                        <div className="absolute inset-x-8 top-10 h-[1px] bg-white/15" />
                        <div className="absolute inset-x-8 bottom-10 h-[1px] bg-white/15" />
                        <div className="absolute inset-y-10 left-8 w-[1px] bg-white/15" />
                        <div className="absolute inset-y-10 right-8 w-[1px] bg-white/15" />
                        <div className="absolute left-8 right-8 top-1/2 h-1 -translate-y-1/2 rounded-full bg-veridian-sky/80 shadow-[0_0_24px_rgba(14,165,233,0.7)] animate-pulse" />

                        <div className="text-center">
                          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/10">
                            <ScanLine className="h-12 w-12 text-veridian-sky" />
                          </div>
                          <p className="mt-6 text-lg font-semibold text-white">
                            {scannerStatus === 'searching' ? 'Align batch QR code inside the frame' : 'Batch identified'}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {scannerStatus === 'searching'
                              ? 'Analyzing the tag and matching it to the active batches in your inventory.'
                              : `${scannedBatch?.name || 'Batch'} is ready for feeding details.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 bg-[#111827] px-4 py-4">
                    <button type="button" onClick={handleBack} className="veridian-btn-secondary w-full">
                      Cancel Scan
                    </button>
                  </div>
                </div>
              ) : null}

              {activeView === 'feeding' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="px-4 pt-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-caption">Progress</span>
                        <span className="text-sm font-medium text-white">{feedingStep}/3</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {[1, 2, 3].map((step) => (
                          <span
                            key={step}
                            className={`h-2 flex-1 rounded-full ${feedingStep >= step ? 'bg-veridian-emerald' : 'bg-white/10'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    {feedingStep === 1 ? (
                      <div className="space-y-4">
                        <button
                          type="button"
                          onClick={openScannerFlow}
                          className="flex min-h-touch w-full items-center justify-between rounded-[24px] border border-veridian-sky/30 bg-veridian-sky/10 px-4 py-4 text-left text-white"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-veridian-sky/20">
                              <ScanLine className="h-6 w-6 text-veridian-sky" />
                            </div>
                            <div>
                              <p className="text-base font-semibold">Scan QR</p>
                              <p className="text-sm text-slate-200">Simulate detection to jump into the right batch.</p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-300" />
                        </button>

                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-caption">Step 1</p>
                            <h3 className="mt-1 text-lg font-semibold text-white">Select a batch</h3>
                            <p className="mt-1 text-sm text-slate-caption">Choose the active batch you are feeding today.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openCreateBatchFlow('feeding')}
                            className="text-sm font-medium text-veridian-sky hover:underline"
                          >
                            Can't find batch? Create New
                          </button>
                        </div>

                        {availableBatches.length ? (
                          <BatchPicker
                            batches={availableBatches}
                            selectedBatchId={feedingForm.batchId}
                            onSelect={(batchId) => setFeedingForm((previous) => ({ ...previous, batchId }))}
                          />
                        ) : (
                          <div className="rounded-[22px] border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-caption">
                            No active batches yet. Open Livestock Inventory and create a batch first.
                          </div>
                        )}
                      </div>
                    ) : null}

                    {feedingStep === 2 ? (
                      <div className="space-y-5">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-caption">Step 2</p>
                          <h3 className="mt-1 text-lg font-semibold text-white">Enter feed details</h3>
                          <p className="mt-1 text-sm text-slate-caption">
                            Set the feed type and total weight for {selectedFeedingBatch?.name || 'the selected batch'}.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {FEED_TYPES.map((feedType) => {
                            const isSelected = feedingForm.feedType === feedType.value;

                            return (
                              <button
                                key={feedType.value}
                                type="button"
                                onClick={() => setFeedingForm((previous) => ({ ...previous, feedType: feedType.value }))}
                                className={`min-h-touch rounded-[24px] border px-4 py-4 text-left transition-colors ${
                                  isSelected ? feedType.className : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                                }`}
                              >
                                <p className="text-base font-semibold">{feedType.label}</p>
                                <p className="mt-1 text-sm text-slate-200/80">{feedType.hint}</p>
                              </button>
                            );
                          })}
                        </div>

                        <div>
                          <label htmlFor="feeding-weight" className="veridian-label">Weight (kg)</label>
                          <input
                            id="feeding-weight"
                            type="number"
                            min="1"
                            step="1"
                            className="veridian-input"
                            placeholder="Enter total feed weight"
                            value={feedingForm.weight}
                            onChange={(event) => setFeedingForm((previous) => ({ ...previous, weight: event.target.value }))}
                          />
                        </div>

                        <div>
                          <label htmlFor="feeding-notes" className="veridian-label">Notes</label>
                          <textarea
                            id="feeding-notes"
                            rows={4}
                            className="veridian-input resize-none"
                            placeholder="Optional observations for this feeding run"
                            value={feedingForm.notes}
                            onChange={(event) => setFeedingForm((previous) => ({ ...previous, notes: event.target.value }))}
                          />
                        </div>
                      </div>
                    ) : null}

                    {feedingStep === 3 ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-caption">Step 3</p>
                          <h3 className="mt-1 text-lg font-semibold text-white">Review and submit</h3>
                          <p className="mt-1 text-sm text-slate-caption">Double-check the summary before you submit.</p>
                        </div>

                        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-slate-caption">Batch</span>
                              <span className="text-sm font-semibold text-white">{selectedFeedingBatch?.name || 'Not selected'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-slate-caption">Feed Type</span>
                              <span className="text-sm font-semibold text-white">
                                {FEED_TYPES.find((type) => type.value === feedingForm.feedType)?.label || 'Starter Feed'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-slate-caption">Weight</span>
                              <span className="text-sm font-semibold text-white">{feedingForm.weight || '0'} kg</span>
                            </div>
                            <div className="border-t border-white/10 pt-3">
                              <p className="text-sm text-slate-caption">Notes</p>
                              <p className="mt-1 text-sm text-white">{feedingForm.notes.trim() || 'No notes added.'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-white/10 bg-[#111827] px-4 py-4">
                    <div className="flex gap-3">
                      {feedingStep === 1 ? (
                        <button
                          type="button"
                          onClick={() => setFeedingStep(2)}
                          disabled={!feedingForm.batchId}
                          className="veridian-btn-primary flex-1"
                        >
                          Continue
                        </button>
                      ) : null}

                      {feedingStep === 2 ? (
                        <>
                          <button type="button" onClick={handleBack} className="veridian-btn-secondary flex-1">
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={() => setFeedingStep(3)}
                            disabled={!isFeedingStepTwoValid}
                            className="veridian-btn-primary flex-1"
                          >
                            Review
                          </button>
                        </>
                      ) : null}

                      {feedingStep === 3 ? (
                        <>
                          <button type="button" onClick={handleBack} className="veridian-btn-secondary flex-1" disabled={isSubmitting}>
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSubmitFeeding()}
                            disabled={isSubmitting}
                            className="veridian-btn-primary flex-1 inline-flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? <Spinner size="sm" /> : null}
                            Submit
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {(activeView === 'mortality' || activeView === 'medicine') ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="px-4 pt-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-caption">Progress</span>
                        <span className="text-sm font-medium text-white">{detailStep}/2</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {[1, 2].map((step) => (
                          <span
                            key={step}
                            className={`h-2 flex-1 rounded-full ${detailStep >= step ? 'bg-veridian-emerald' : 'bg-white/10'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    {detailStep === 1 ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-caption">Step 1</p>
                          <h3 className="mt-1 text-lg font-semibold text-white">
                            {activeView === 'medicine' ? 'Select a batch for treatment' : 'Select a batch for mortality'}
                          </h3>
                          <p className="mt-1 text-sm text-slate-caption">Choose the batch you need to update before entering the details.</p>
                        </div>

                        <BatchPicker
                          batches={availableBatches}
                          selectedBatchId={detailForm.batchId}
                          onSelect={(batchId) => setDetailForm((previous) => ({ ...previous, batchId }))}
                        />
                      </div>
                    ) : null}

                    {detailStep === 2 ? (
                      <div className="space-y-5">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-caption">Step 2</p>
                          <h3 className="mt-1 text-lg font-semibold text-white">
                            {activeView === 'medicine' ? 'Enter dosage and type' : 'Enter quantity and reason'}
                          </h3>
                          <p className="mt-1 text-sm text-slate-caption">
                            {activeView === 'medicine'
                              ? `Capture the medicine details for ${selectedDetailBatch?.name || 'the selected batch'}.`
                              : `Record the reason for the loss in ${selectedDetailBatch?.name || 'the selected batch'}.`}
                          </p>
                        </div>

                        <div>
                          <label htmlFor="detail-quantity" className="veridian-label">
                            {activeView === 'medicine' ? 'Dosage Count' : 'Quantity'}
                          </label>
                          <input
                            id="detail-quantity"
                            type="number"
                            min="1"
                            step="1"
                            className="veridian-input"
                            value={detailForm.quantity}
                            onChange={(event) => setDetailForm((previous) => ({ ...previous, quantity: event.target.value }))}
                          />
                        </div>

                        <div>
                          <label htmlFor="detail-type" className="veridian-label">
                            {activeView === 'medicine' ? 'Medicine Type' : 'Reason'}
                          </label>
                          <input
                            id="detail-type"
                            type="text"
                            className="veridian-input"
                            placeholder={activeView === 'medicine' ? 'e.g. Vitamin B Complex' : 'e.g. Heat stress'}
                            value={detailForm.detailType}
                            onChange={(event) => setDetailForm((previous) => ({ ...previous, detailType: event.target.value }))}
                          />
                        </div>

                        <div>
                          <label htmlFor="detail-notes" className="veridian-label">Notes</label>
                          <textarea
                            id="detail-notes"
                            rows={4}
                            className="veridian-input resize-none"
                            placeholder={activeView === 'medicine' ? 'Treatment notes or medicine details' : 'Add any extra observations'}
                            value={detailForm.notes}
                            onChange={(event) => setDetailForm((previous) => ({ ...previous, notes: event.target.value }))}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-white/10 bg-[#111827] px-4 py-4">
                    <div className="flex gap-3">
                      {detailStep === 1 ? (
                        <button
                          type="button"
                          onClick={() => setDetailStep(2)}
                          disabled={!detailForm.batchId}
                          className="veridian-btn-primary flex-1"
                        >
                          Continue
                        </button>
                      ) : (
                        <>
                          <button type="button" onClick={handleBack} className="veridian-btn-secondary flex-1" disabled={isSubmitting}>
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSubmitDetail()}
                            disabled={isSubmitting || !isDetailStepTwoValid}
                            className="veridian-btn-primary flex-1 inline-flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? <Spinner size="sm" /> : null}
                            Submit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {activeView === 'sales' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="px-4 pt-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-caption">Progress</span>
                        <span className="text-sm font-medium text-white">{salesStep}/2</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {[1, 2].map((step) => (
                          <span
                            key={step}
                            className={`h-2 flex-1 rounded-full ${salesStep >= step ? 'bg-veridian-emerald' : 'bg-white/10'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    {salesStep === 1 ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-caption">Step 1</p>
                          <h3 className="mt-1 text-lg font-semibold text-white">Select a batch to sell</h3>
                          <p className="mt-1 text-sm text-slate-caption">Choose the batch that this sale should reduce.</p>
                        </div>

                        <BatchPicker
                          batches={availableBatches}
                          selectedBatchId={salesForm.batchId}
                          onSelect={(batchId) => setSalesForm((previous) => ({ ...previous, batchId }))}
                        />
                      </div>
                    ) : null}

                    {salesStep === 2 ? (
                      <div className="space-y-5">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-caption">Step 2</p>
                          <h3 className="mt-1 text-lg font-semibold text-white">Enter sale details</h3>
                          <p className="mt-1 text-sm text-slate-caption">
                            Capture the buyer, quantity, and pricing for {selectedSalesBatch?.name || 'the selected batch'}.
                          </p>
                        </div>

                        <div>
                          <label htmlFor="sales-customer" className="veridian-label">Customer Name</label>
                          <input
                            id="sales-customer"
                            type="text"
                            className="veridian-input"
                            placeholder="Enter the buyer name"
                            value={salesForm.customerName}
                            onChange={(event) => setSalesForm((previous) => ({ ...previous, customerName: event.target.value }))}
                          />
                        </div>

                        <div>
                          <label htmlFor="sales-unit-price" className="veridian-label">Price per Unit</label>
                          <input
                            id="sales-unit-price"
                            type="number"
                            min="0.01"
                            step="0.01"
                            className="veridian-input"
                            placeholder="Enter price per unit"
                            value={salesForm.unitPrice}
                            onChange={(event) => setSalesForm((previous) => ({ ...previous, unitPrice: event.target.value }))}
                          />
                        </div>

                        <div>
                          <label htmlFor="sales-quantity" className="veridian-label">Quantity</label>
                          <input
                            id="sales-quantity"
                            type="number"
                            min="1"
                            step="1"
                            className="veridian-input"
                            value={salesForm.quantity}
                            onChange={(event) => setSalesForm((previous) => ({ ...previous, quantity: event.target.value }))}
                          />
                        </div>

                        <div className="rounded-[24px] border border-veridian-sky/30 bg-veridian-sky/10 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-veridian-sky">Total Amount</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(salesTotalAmount)}</p>
                          <p className="mt-1 text-sm text-slate-200">Calculated automatically from quantity and unit price.</p>
                        </div>

                        <div>
                          <label htmlFor="sales-notes" className="veridian-label">Notes</label>
                          <textarea
                            id="sales-notes"
                            rows={4}
                            className="veridian-input resize-none"
                            placeholder="Optional sale notes"
                            value={salesForm.notes}
                            onChange={(event) => setSalesForm((previous) => ({ ...previous, notes: event.target.value }))}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-white/10 bg-[#111827] px-4 py-4">
                    <div className="flex gap-3">
                      {salesStep === 1 ? (
                        <button
                          type="button"
                          onClick={() => setSalesStep(2)}
                          disabled={!salesForm.batchId}
                          className="veridian-btn-primary flex-1"
                        >
                          Continue
                        </button>
                      ) : (
                        <>
                          <button type="button" onClick={handleBack} className="veridian-btn-secondary flex-1" disabled={isSubmitting}>
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSubmitSale()}
                            disabled={isSubmitting || !isSalesStepTwoValid}
                            className="veridian-btn-primary flex-1 inline-flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? <Spinner size="sm" /> : null}
                            Submit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {activeView === 'livestock' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    <button
                      type="button"
                      onClick={() => openCreateLivestockFlow('inventory')}
                      className="mb-4 flex min-h-touch w-full items-center justify-between rounded-[24px] border border-veridian-emerald/30 bg-veridian-emerald/10 px-4 py-4 text-left text-white"
                    >
                      <div>
                        <p className="text-base font-semibold">+ Add New Species</p>
                        <p className="mt-1 text-sm text-slate-200">Create a livestock category before making batches.</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300" />
                    </button>

                    {isInventoryLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Spinner size="lg" />
                      </div>
                    ) : livestockList.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-caption">
                        No livestock species yet. Add your first species to start creating batches.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {livestockList.map((livestock) => (
                          <button
                            key={livestock.id}
                            type="button"
                            onClick={() => void loadBatchesForLivestock(livestock)}
                            className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-left transition-colors hover:bg-white/10"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-base font-semibold text-white">{livestock.type}</p>
                                <p className="mt-1 text-sm text-slate-caption">
                                  {livestock.batchCount} batch{livestock.batchCount === 1 ? '' : 'es'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-white">{livestock.totalCurrentCount}</p>
                                <p className="mt-1 text-xs text-slate-caption">current head</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/10 bg-[#111827] px-4 py-4">
                    <button type="button" onClick={handleBack} className="veridian-btn-secondary w-full">
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              ) : null}

              {activeView === 'batches' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="mb-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-caption">Selected Species</p>
                      <h3 className="mt-1 text-xl font-semibold text-white">{selectedLivestock?.type || 'Livestock'}</h3>
                      <p className="mt-1 text-sm text-slate-caption">
                        {selectedLivestock?.batchCount || 0} batch{selectedLivestock?.batchCount === 1 ? '' : 'es'} tracked
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCreateBatchFlow('inventory', selectedLivestock ? String(selectedLivestock.id) : undefined)}
                      className="mb-4 flex min-h-touch w-full items-center justify-between rounded-[24px] border border-veridian-emerald/30 bg-veridian-emerald/10 px-4 py-4 text-left text-white"
                    >
                      <div>
                        <p className="text-base font-semibold">+ Create New Batch</p>
                        <p className="mt-1 text-sm text-slate-200">Add a new arrival for this livestock species.</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300" />
                    </button>

                    {isInventoryLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Spinner size="lg" />
                      </div>
                    ) : inventoryBatches.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-caption">
                        No batches yet for this species. Create the first batch to unlock quick actions.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {inventoryBatches.map((batch) => (
                          <article key={batch.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-base font-semibold text-white">{batch.name}</p>
                                <p className="mt-1 text-sm text-slate-caption">{batch.breed || batch.livestockType}</p>
                              </div>
                              <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                                {batch.currentCount} heads
                              </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                              <div className="rounded-[18px] border border-white/10 bg-midnight-navy/70 px-3 py-3">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-caption">Age</p>
                                <p className="mt-1 text-white">{formatAge(batch.ageInDays)}</p>
                              </div>
                              <div className="rounded-[18px] border border-white/10 bg-midnight-navy/70 px-3 py-3">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-caption">Arrival</p>
                                <p className="mt-1 text-white">{batch.arrivalDate || 'Not set'}</p>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/10 bg-[#111827] px-4 py-4">
                    <button type="button" onClick={handleBack} className="veridian-btn-secondary w-full">
                      Back to Species
                    </button>
                  </div>
                </div>
              ) : null}

              {activeView === 'create-livestock' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-caption">New Species</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">Add a livestock category</h3>
                      <p className="mt-1 text-sm text-slate-caption">Create the species first, then you can start grouping its batches.</p>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div>
                        <label htmlFor="livestock-type" className="veridian-label">Species Name</label>
                        <input
                          id="livestock-type"
                          type="text"
                          className="veridian-input"
                          placeholder="e.g. Swine"
                          value={createLivestockForm.type}
                          onChange={(event) => setCreateLivestockForm({ type: event.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 bg-[#111827] px-4 py-4">
                    <div className="flex gap-3">
                      <button type="button" onClick={handleBack} className="veridian-btn-secondary flex-1" disabled={isSubmitting}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateLivestock()}
                        disabled={isSubmitting}
                        className="veridian-btn-primary flex-1 inline-flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? <Spinner size="sm" /> : null}
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeView === 'create-batch' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-caption">New Batch</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">Create a new batch</h3>
                      <p className="mt-1 text-sm text-slate-caption">Batch creation unlocks the field actions for feeding, medicine, mortality, and sales.</p>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div>
                        <label htmlFor="batch-livestock" className="veridian-label">Livestock Species</label>
                        <select
                          id="batch-livestock"
                          className="veridian-input"
                          value={createBatchForm.livestockId}
                          onChange={(event) => setCreateBatchForm((previous) => ({ ...previous, livestockId: event.target.value }))}
                        >
                          {livestockList.map((livestock) => (
                            <option key={livestock.id} value={livestock.id}>
                              {livestock.type}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="batch-name" className="veridian-label">Batch Name</label>
                        <input
                          id="batch-name"
                          type="text"
                          className="veridian-input"
                          placeholder="e.g. Batch A12"
                          value={createBatchForm.name}
                          onChange={(event) => setCreateBatchForm((previous) => ({ ...previous, name: event.target.value }))}
                        />
                      </div>

                      <div>
                        <label htmlFor="batch-count" className="veridian-label">Initial Count</label>
                        <input
                          id="batch-count"
                          type="number"
                          min="1"
                          step="1"
                          className="veridian-input"
                          placeholder="Enter initial head count"
                          value={createBatchForm.initialCount}
                          onChange={(event) => setCreateBatchForm((previous) => ({ ...previous, initialCount: event.target.value }))}
                        />
                      </div>

                      <div>
                        <label htmlFor="batch-breed" className="veridian-label">Breed</label>
                        <input
                          id="batch-breed"
                          type="text"
                          className="veridian-input"
                          placeholder="e.g. Large White"
                          value={createBatchForm.breed}
                          onChange={(event) => setCreateBatchForm((previous) => ({ ...previous, breed: event.target.value }))}
                        />
                      </div>

                      <div>
                        <label htmlFor="batch-arrival" className="veridian-label">Arrival Date</label>
                        <input
                          id="batch-arrival"
                          type="date"
                          className="veridian-input"
                          value={createBatchForm.arrivalDate}
                          onChange={(event) => setCreateBatchForm((previous) => ({ ...previous, arrivalDate: event.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 bg-[#111827] px-4 py-4">
                    <div className="flex gap-3">
                      <button type="button" onClick={handleBack} className="veridian-btn-secondary flex-1" disabled={isSubmitting}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateBatch()}
                        disabled={isSubmitting}
                        className="veridian-btn-primary flex-1 inline-flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? <Spinner size="sm" /> : null}
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
