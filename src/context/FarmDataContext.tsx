import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  getAdminAnalyticsSummary,
  getAdminHandlers,
  getAllActivityLogs,
  getBusinessTrends,
  getHandlerActivityLogs,
  getInventorySpeciesBatches,
  getInventorySummary,
  getResourceEfficiency,
  getUserRole,
} from '../features/auth/authService';
import {
  getDashboardStats,
  getAssignedOperationalTasks,
  getLivestockBatches,
  getLivestockInventory,
  getOperationalAlerts,
  getRecentLogs,
} from '../features/dashboard/farmService';
import { useAuth } from './AuthContext';

const STALE_TIME_MS = 300_000;
const HANDLER_ROLE = 'ROLE_HANDLER';
const ADMIN_ROLE = 'ROLE_ADMIN';

export interface DashboardBatchOption {
  id: number;
  name: string;
  livestockType: string;
  currentCount: number;
}

export interface DashboardStats {
  totalLivestock: number;
  activeBatchCount: number;
  todayActionCount: number;
  availableBatches: DashboardBatchOption[];
}

export interface DashboardRecentLog {
  id: number;
  actionType: string;
  batchId: number;
  batchName?: string;
  quantity: number;
  measuredQuantity?: number | null;
  remarks?: string;
  timestamp: string;
}

export interface OperationalAlert {
  id: number;
  ruleCode: string;
  message: string;
  severity: string;
  status: string;
  dueAt?: string | null;
  batchId?: number | null;
}

export interface OperationalTask {
  id: number;
  taskKey: string;
  title: string;
  description?: string | null;
  locationLabel?: string | null;
  status: string;
  priority: string;
  dueAt?: string | null;
  completedAt?: string | null;
  batchId?: number | null;
}

export interface LivestockSummary {
  id: number;
  type: string;
  batchCount: number;
  totalCurrentCount: number;
}

export interface InventoryBatch {
  id: number;
  livestockId: number;
  livestockType: string;
  name: string;
  breed?: string | null;
  initialCount: number;
  currentCount: number;
  arrivalDate?: string | null;
  ageInDays: number;
}

export interface DashboardAnalytics {
  totalLivestock: number;
  activeEventsCount: number;
  revenueToDate: number;
  userActivityTrend: Record<string, number>;
}

export interface InventorySummary {
  totalLivestock: number;
  totalSpecies: number;
  totalActiveBatches: number;
  speciesBreakdown: LivestockSummary[];
}

export interface ActivityLog {
  id: number;
  action: string;
  timestamp: string;
  fullName: string | null;
  username: string | null;
  userId?: number | null;
  targetId?: number | null;
  ipAddress?: string | null;
}

export interface HandlerActivityLog {
  id: number;
  userId: number | null;
  fullName: string | null;
  username: string | null;
  action: string;
  actionType: string;
  targetId?: number | null;
  batchName?: string | null;
  livestockId?: number | null;
  livestockType?: string | null;
  timestamp: string;
  ipAddress?: string | null;
}

export interface HandlerActivityFilters {
  startDate?: string;
  endDate?: string;
  livestockId?: number | null;
}

export interface HandlerSummary {
  id: number;
  fullName: string | null;
  username: string;
  email?: string | null;
  activeZone?: string | null;
  activeBatchCount?: number;
  totalLivestock?: number;
}

export interface BusinessTrendPoint {
  date: string;
  totalRevenue: number;
  mortalityCount: number;
  currentStock: number;
}

export interface ResourceEfficiencyPoint {
  date: string;
  feedConsumed: number;
  survivalRate: number;
  activePopulation: number;
}

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type QueryScope = 'handler' | 'admin';

type FarmDataContextValue = {
  role: string | null;
  stats: DashboardStats;
  batches: DashboardBatchOption[];
  recentLogs: DashboardRecentLog[];
  tasks: OperationalTask[];
  alerts: OperationalAlert[];
  livestock: LivestockSummary[];
  analytics: DashboardAnalytics;
  inventorySummary: InventorySummary;
  globalLogs: ActivityLog[];
  handlers: HandlerSummary[];
  error: string;
  isBootstrapping: boolean;
  isRefreshing: boolean;
  refreshFarmData: () => Promise<void>;
  invalidateFarmData: () => Promise<void>;
};

const EMPTY_STATS: DashboardStats = {
  totalLivestock: 0,
  activeBatchCount: 0,
  todayActionCount: 0,
  availableBatches: [],
};

const EMPTY_ANALYTICS: DashboardAnalytics = {
  totalLivestock: 0,
  activeEventsCount: 0,
  revenueToDate: 0,
  userActivityTrend: {},
};

const EMPTY_INVENTORY_SUMMARY: InventorySummary = {
  totalLivestock: 0,
  totalSpecies: 0,
  totalActiveBatches: 0,
  speciesBreakdown: [],
};

export const farmQueryKeys = {
  root: ['farm'] as const,
  handlerStats: (userId: number | null | undefined) => ['farm', 'handler', userId ?? 'guest', 'stats'] as const,
  handlerRecentLogs: (userId: number | null | undefined) => ['farm', 'handler', userId ?? 'guest', 'recent-logs'] as const,
  handlerTasks: (userId: number | null | undefined) => ['farm', 'handler', userId ?? 'guest', 'tasks'] as const,
  handlerAlerts: (userId: number | null | undefined) => ['farm', 'handler', userId ?? 'guest', 'alerts'] as const,
  handlerLivestock: (userId: number | null | undefined) => ['farm', 'handler', userId ?? 'guest', 'livestock'] as const,
  handlerLivestockBatches: (userId: number | null | undefined, livestockId: number | null | undefined) =>
    ['farm', 'handler', userId ?? 'guest', 'livestock', livestockId ?? 'none', 'batches'] as const,
  adminAnalytics: (userId: number | null | undefined) => ['farm', 'admin', userId ?? 'guest', 'analytics'] as const,
  adminInventorySummary: (userId: number | null | undefined) => ['farm', 'admin', userId ?? 'guest', 'inventory-summary'] as const,
  adminGlobalLogs: (userId: number | null | undefined, limit = 15) =>
    ['farm', 'admin', userId ?? 'guest', 'logs', limit] as const,
  adminHandlers: (userId: number | null | undefined) => ['farm', 'admin', userId ?? 'guest', 'handlers'] as const,
  activityLogs: (requestingUserId: number | null | undefined, subjectUserId: number | null | undefined, limit = 20) =>
    ['farm', 'admin', requestingUserId ?? 'guest', 'activity-logs', subjectUserId ?? 'all', limit] as const,
  adminSpeciesBatches: (userId: number | null | undefined, livestockId: number | null | undefined) =>
    ['farm', 'admin', userId ?? 'guest', 'inventory', livestockId ?? 'none', 'batches'] as const,
  businessTrends: (userId: number | null | undefined, range: string) =>
    ['farm', 'admin', userId ?? 'guest', 'business-trends', range] as const,
  resourceEfficiency: (
    userId: number | null | undefined,
    livestockId: number | null | undefined,
    range: string
  ) => ['farm', 'admin', userId ?? 'guest', 'resource-efficiency', livestockId ?? 'none', range] as const,
};

const FarmDataContext = createContext<FarmDataContextValue | null>(null);

function extractApiData<T>(response: ApiEnvelope<T>, fallbackMessage: string): T {
  if (!response?.success) {
    throw new Error(response?.message || fallbackMessage);
  }

  return response.data as T;
}

function getQueryErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return '';
}

export function FarmDataProvider({ children }: { children: ReactNode }) {
  const { user, setSyncStatus } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const role = user?.role || getUserRole();
  const isHandler = role === HANDLER_ROLE;

  const handlerStatsQuery = useQuery({
    queryKey: farmQueryKeys.handlerStats(userId),
    queryFn: async () => extractApiData(await getDashboardStats(), 'Unable to load dashboard stats.'),
    enabled: isHandler && Boolean(userId),
    staleTime: STALE_TIME_MS,
  });

  const recentLogsQuery = useQuery({
    queryKey: farmQueryKeys.handlerRecentLogs(userId),
    queryFn: async () => extractApiData(await getRecentLogs(), 'Unable to load recent logs.'),
    enabled: isHandler && Boolean(userId),
    staleTime: STALE_TIME_MS,
  });

  const tasksQuery = useQuery({
    queryKey: farmQueryKeys.handlerTasks(userId),
    queryFn: async () => extractApiData(await getAssignedOperationalTasks(), 'Unable to load assigned tasks.'),
    enabled: isHandler && Boolean(userId),
    staleTime: STALE_TIME_MS,
  });

  const alertsQuery = useQuery({
    queryKey: farmQueryKeys.handlerAlerts(userId),
    queryFn: async () => extractApiData(await getOperationalAlerts(), 'Unable to load operational alerts.'),
    enabled: isHandler && Boolean(userId),
    staleTime: STALE_TIME_MS,
  });

  const livestockQuery = useQuery({
    queryKey: farmQueryKeys.handlerLivestock(userId),
    queryFn: async () => extractApiData(await getLivestockInventory(), 'Unable to load livestock inventory.'),
    enabled: isHandler && Boolean(userId),
    staleTime: STALE_TIME_MS,
  });

  const relevantQueries = useMemo(() => {
    if (isHandler) {
      return [handlerStatsQuery, recentLogsQuery, livestockQuery, tasksQuery, alertsQuery];
    }

    return [];
  }, [
    handlerStatsQuery,
    isHandler,
    livestockQuery,
    recentLogsQuery,
    tasksQuery,
    alertsQuery,
  ]);

  const isBootstrapping = relevantQueries.length > 0
    && relevantQueries.every((query) => query.data === undefined)
    && relevantQueries.some((query) => query.isPending || query.isFetching);
  const isRefreshing = relevantQueries.some((query) => query.isFetching);
  const error = getQueryErrorMessage(relevantQueries.find((query) => query.error)?.error);
  const lastSyncedAt = relevantQueries.reduce((latest, query) => Math.max(latest, query.dataUpdatedAt || 0), 0);

  useEffect(() => {
    if (!userId) {
      setSyncStatus({ state: 'idle', lastSyncedAt: null });
      return;
    }

    if (error) {
      setSyncStatus((current) => ({
        ...current,
        state: 'error',
        lastSyncedAt: current.lastSyncedAt,
      }));
      return;
    }

    if (isRefreshing) {
      setSyncStatus((current) => ({
        ...current,
        state: 'syncing',
      }));
      return;
    }

    if (lastSyncedAt > 0) {
      setSyncStatus({
        state: 'synced',
        lastSyncedAt: new Date(lastSyncedAt).toISOString(),
      });
      return;
    }

    setSyncStatus({ state: 'idle', lastSyncedAt: null });
  }, [error, isRefreshing, lastSyncedAt, setSyncStatus, userId]);

  const invalidateFarmData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: farmQueryKeys.root });
  }, [queryClient]);

  const refreshFarmData = useCallback(async () => {
    await invalidateFarmData();
  }, [invalidateFarmData]);

  const value = useMemo<FarmDataContextValue>(() => ({
    role,
    stats: handlerStatsQuery.data ?? EMPTY_STATS,
    batches: handlerStatsQuery.data?.availableBatches ?? EMPTY_STATS.availableBatches,
    recentLogs: recentLogsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    alerts: alertsQuery.data ?? [],
    livestock: livestockQuery.data ?? [],
    analytics: EMPTY_ANALYTICS,
    inventorySummary: EMPTY_INVENTORY_SUMMARY,
    globalLogs: [],
    handlers: [],
    error,
    isBootstrapping,
    isRefreshing,
    refreshFarmData,
    invalidateFarmData,
  }), [
    error,
    handlerStatsQuery.data,
    alertsQuery.data,
    invalidateFarmData,
    isBootstrapping,
    isRefreshing,
    livestockQuery.data,
    recentLogsQuery.data,
    tasksQuery.data,
    refreshFarmData,
    role,
  ]);

  return <FarmDataContext.Provider value={value}>{children}</FarmDataContext.Provider>;
}

export function useFarmData() {
  const context = useContext(FarmDataContext);
  if (!context) {
    throw new Error('useFarmData must be used within a FarmDataProvider');
  }

  return context;
}

export function useLivestockBatches(livestockId: number | null | undefined, scope: QueryScope = 'handler') {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const role = user?.role || getUserRole();
  const isEnabled = Boolean(userId) && Boolean(livestockId) && (
    (scope === 'handler' && role === HANDLER_ROLE) || (scope === 'admin' && role === ADMIN_ROLE)
  );

  return useQuery({
    queryKey: scope === 'admin'
      ? farmQueryKeys.adminSpeciesBatches(userId, livestockId)
      : farmQueryKeys.handlerLivestockBatches(userId, livestockId),
    queryFn: async () => {
      if (!livestockId) {
        return [];
      }

      if (scope === 'admin') {
        return extractApiData(
          await getInventorySpeciesBatches(livestockId),
          'Unable to load livestock batches.'
        );
      }

      return extractApiData(
        await getLivestockBatches(livestockId),
        'Unable to load livestock batches.'
      );
    },
    enabled: isEnabled,
    staleTime: STALE_TIME_MS,
  });
}

export function useAdminAnalytics() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const role = user?.role || getUserRole();

  return useQuery({
    queryKey: farmQueryKeys.adminAnalytics(userId),
    queryFn: async () => extractApiData(await getAdminAnalyticsSummary(), 'Unable to load analytics.'),
    enabled: role === ADMIN_ROLE && Boolean(userId),
    staleTime: STALE_TIME_MS,
  });
}

export function useAdminInventorySummary() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const role = user?.role || getUserRole();

  return useQuery({
    queryKey: farmQueryKeys.adminInventorySummary(userId),
    queryFn: async () => extractApiData(await getInventorySummary(), 'Unable to load inventory summary.'),
    enabled: role === ADMIN_ROLE && Boolean(userId),
    staleTime: STALE_TIME_MS,
  });
}

export function useAdminGlobalLogs(limit = 15) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const role = user?.role || getUserRole();

  return useQuery({
    queryKey: farmQueryKeys.adminGlobalLogs(userId, limit),
    queryFn: async () => extractApiData(await getAllActivityLogs({ limit }), 'Unable to load activity logs.'),
    enabled: role === ADMIN_ROLE && Boolean(userId),
    staleTime: STALE_TIME_MS,
  });
}

export function useAdminHandlers() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const role = user?.role || getUserRole();

  return useQuery({
    queryKey: farmQueryKeys.adminHandlers(userId),
    queryFn: async () => extractApiData(await getAdminHandlers(), 'Unable to load handler roster.'),
    enabled: role === ADMIN_ROLE && Boolean(userId),
    staleTime: STALE_TIME_MS,
  });
}

export function useBusinessTrends(range = '7d') {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const role = user?.role || getUserRole();

  return useQuery({
    queryKey: farmQueryKeys.businessTrends(userId, range),
    queryFn: async () => extractApiData(await getBusinessTrends(range), 'Unable to load business trends.'),
    enabled: role === ADMIN_ROLE && Boolean(userId),
    staleTime: STALE_TIME_MS,
  });
}

export function useResourceEfficiency(livestockId: number | null | undefined, range = '7d') {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const role = user?.role || getUserRole();

  return useQuery({
    queryKey: farmQueryKeys.resourceEfficiency(userId, livestockId, range),
    queryFn: async () => {
      if (!livestockId) {
        return [];
      }

      return extractApiData(
        await getResourceEfficiency(livestockId, range),
        'Unable to load resource efficiency analytics.'
      );
    },
    enabled: role === ADMIN_ROLE && Boolean(userId) && Boolean(livestockId),
    staleTime: STALE_TIME_MS,
  });
}

export function useActivityLogs(subjectUserId: number | null | undefined, limit = 20) {
  const { user } = useAuth();
  const requestingUserId = user?.id ?? null;
  const role = user?.role || getUserRole();

  return useQuery({
    queryKey: farmQueryKeys.activityLogs(requestingUserId, subjectUserId, limit),
    queryFn: async () => extractApiData(
      await getAllActivityLogs({
        ...(subjectUserId ? { userId: subjectUserId } : {}),
        limit,
      }),
      'Unable to load activity logs.'
    ),
    enabled: role === ADMIN_ROLE && Boolean(requestingUserId) && subjectUserId != null,
    staleTime: STALE_TIME_MS,
  });
}

export function useHandlerActivityLogs(
  handlerId: number | null | undefined,
  filters: HandlerActivityFilters
) {
  const { user } = useAuth();
  const requestingUserId = user?.id ?? null;
  const role = user?.role || getUserRole();

  return useQuery({
    queryKey: ['handler-logs', handlerId ?? 'none', filters],
    queryFn: async () => {
      if (!handlerId) {
        return [];
      }

      return extractApiData(
        await getHandlerActivityLogs(handlerId, filters),
        'Unable to load handler activity logs.'
      );
    },
    enabled: role === ADMIN_ROLE && Boolean(requestingUserId) && Boolean(handlerId),
    staleTime: 60_000,
  });
}
