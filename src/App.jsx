// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import Dashboard from './features/dashboard/Dashboard';
import UserManagementPage from './features/profile/UserManagementPage';
import AdminLayout from './features/admin/AdminLayout';
import CommandCenter from './features/admin/CommandCenter';
import HandlersView from './features/admin/HandlersView';
import LivestockView from './features/admin/LivestockView';
import AnalyticsView from './features/admin/AnalyticsView';
import SettingsView from './features/admin/SettingsView';
import MobileHandler from './features/mobile/MobileHandler';
import ProtectedRoute, { AdminRoute, HandlerRoute } from './components/ProtectedRoute';
import Spinner from './components/Spinner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FarmDataProvider } from './context/FarmDataContext';

// Legacy protected route wrapper for general auth (backwards compatibility)
function LegacyProtectedRoute({ children }) {
  const { user, isProfileLoading } = useAuth();

  if (!user && isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-midnight-navy font-sans text-white px-4">
        <div className="inline-flex min-h-touch items-center gap-3 rounded-container border border-white/10 bg-deep-slate px-5 py-4 text-sm text-slate-caption shadow-card">
          <Spinner />
          Loading your account...
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* ════════════════════════════════════════════════════════════════
          PUBLIC ROUTES
          ════════════════════════════════════════════════════════════════ */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ════════════════════════════════════════════════════════════════
          ADMIN ROUTES (ROLE_ADMIN only)
          ════════════════════════════════════════════════════════════════ */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        {/* Admin nested routes */}
        <Route index element={<CommandCenter />} />
        <Route path="handlers" element={<HandlersView />} />
        <Route path="livestock" element={<LivestockView />} />
        <Route path="analytics" element={<AnalyticsView />} />
        <Route path="settings" element={<SettingsView />} />
      </Route>

      {/* ════════════════════════════════════════════════════════════════
          MOBILE HANDLER ROUTES (ROLE_HANDLER only)
          ════════════════════════════════════════════════════════════════ */}
      <Route
        path="/mobile"
        element={
          <HandlerRoute>
            <MobileHandler />
          </HandlerRoute>
        }
      />

      {/* ════════════════════════════════════════════════════════════════
          GENERAL PROTECTED ROUTES (Any authenticated user)
          ════════════════════════════════════════════════════════════════ */}
      <Route
        path="/dashboard"
        element={
          <LegacyProtectedRoute>
            <Dashboard />
          </LegacyProtectedRoute>
        }
      />

      <Route
        path="/user-management"
        element={
          <LegacyProtectedRoute>
            <UserManagementPage />
          </LegacyProtectedRoute>
        }
      />

      {/* ════════════════════════════════════════════════════════════════
          REDIRECTS
          ════════════════════════════════════════════════════════════════ */}
      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Catch-all → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FarmDataProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </FarmDataProvider>
    </AuthProvider>
  );
}
