// src/features/admin/AdminLayout.tsx
import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Tractor,
  BarChart3,
  Settings,
  LogOut,
  Leaf,
  Bell,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { useLogoutAction } from '../auth/useLogout';

const navItems = [
  { label: 'Command Center', icon: LayoutDashboard, path: '/admin' },
  { label: 'Handlers', icon: Users, path: '/admin/handlers' },
  { label: 'Livestock', icon: Tractor, path: '/admin/livestock' },
  { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const logout = useLogoutAction();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const currentSection = navItems.find((item) => location.pathname === item.path)
    || navItems.find((item) => item.path !== '/admin' && location.pathname.startsWith(item.path))
    || navItems[0];

  return (
    <div className="min-h-screen flex bg-midnight-navy font-sans text-white">
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={logout}
      />

      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 bg-deep-slate border-r border-white/10 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <div className="w-9 h-9 rounded-input bg-veridian-emerald flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <span className="text-sm font-semibold text-white whitespace-nowrap">Farm Ville</span>
              <span className="block text-xs text-veridian-emerald">Admin Portal</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.path)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-input text-sm font-medium transition-colors min-h-touch ${
                  isActive
                    ? 'bg-veridian-emerald/15 text-veridian-emerald'
                    : 'text-slate-caption hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-3 border-t border-white/10 text-slate-caption hover:text-white transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="w-5 h-5 mx-auto" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center gap-3 px-3 py-3 m-3 rounded-input text-sm font-medium text-slate-caption hover:bg-white/5 hover:text-white border border-white/10 transition-colors min-h-touch"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-deep-slate border-b border-white/10 flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-white">{currentSection.label}</h1>
            <p className="text-xs text-slate-caption">Farm management dashboard</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 rounded-input hover:bg-white/5 transition-colors">
              <Bell className="w-5 h-5 text-slate-caption" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-veridian-rose rounded-full" />
            </button>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-veridian-emerald flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {(user?.username || 'A')[0].toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">{user?.fullName || user?.username || 'Admin'}</p>
                <p className="text-xs text-veridian-emerald">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
