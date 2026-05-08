// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { getUserRole, isTokenExpired, getUserSession } from '../features/auth/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('ROLE_ADMIN' | 'ROLE_HANDLER')[];
}

/**
 * ProtectedRoute component for Role-Based Access Control.
 *
 * Usage:
 *   <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
 *     <AdminDashboard />
 *   </ProtectedRoute>
 *
 * Behavior:
 *   - If not authenticated → redirect to /login
 *   - If authenticated but wrong role → redirect to appropriate dashboard
 *   - If authenticated and correct role → render children
 */
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const user = getUserSession();
  const role = getUserRole();
  const tokenExpired = isTokenExpired();

  // Not authenticated or token expired → redirect to login
  if (!user || tokenExpired) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // No role restrictions → allow access
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user has required role
  if (role && allowedRoles.includes(role as 'ROLE_ADMIN' | 'ROLE_HANDLER')) {
    return <>{children}</>;
  }

  // Wrong role → redirect to appropriate dashboard
  if (role === 'ROLE_ADMIN') {
    return <Navigate to="/admin" replace />;
  } else if (role === 'ROLE_HANDLER') {
    return <Navigate to="/mobile" replace />;
  }

  // Fallback → redirect to login
  return <Navigate to="/login" replace />;
}

/**
 * AdminRoute - Shorthand for admin-only routes.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>{children}</ProtectedRoute>;
}

/**
 * HandlerRoute - Shorthand for handler-only routes.
 */
export function HandlerRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['ROLE_HANDLER']}>{children}</ProtectedRoute>;
}
