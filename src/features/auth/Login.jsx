// src/features/auth/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, Loader2, Leaf, UserRound, Shield } from 'lucide-react';
import { loginUser } from './authService';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { applyAuthenticatedUser } = useAuth();

  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // Field-level validation (username-based)
  const validate = () => {
    const newErrors = {};

    if (!form.username.trim()) {
      newErrors.username = 'Username is required.';
    } else if (form.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    } else if (form.username.trim().length > 50) {
      newErrors.username = 'Username must not exceed 50 characters.';
    } else if (!/^[a-zA-Z0-9._]+$/.test(form.username.trim())) {
      newErrors.username = 'Username can only contain letters, numbers, underscores, and dots.';
    }

    if (!form.password.trim()) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  /**
   * Route user based on their role after successful login.
   * ROLE_ADMIN → /admin (Command Center)
   * ROLE_HANDLER → /mobile (Field Handler App)
   */
  const routeByRole = (role) => {
    const normalizedRole = typeof role === 'string' ? role.toUpperCase() : '';

    if (normalizedRole === 'ROLE_ADMIN' || normalizedRole === 'ADMIN') {
      navigate('/admin');
    } else if (normalizedRole === 'ROLE_HANDLER' || normalizedRole === 'HANDLER') {
      navigate('/mobile');
    } else {
      // Fallback to dashboard for unknown roles
      navigate('/dashboard');
    }
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError('');

    try {
      const response = await loginUser({ username: form.username, password: form.password });

      if (response.success) {
        const authenticatedUser = await applyAuthenticatedUser(response.data);

        // Route based on user role
        const userRole = authenticatedUser?.role || response.data.role;
        routeByRole(userRole);
      } else {
        setServerError(response.message || 'Invalid username or password.');
      }
    } catch (err) {
      if (err.response) {
        const msg = err.response.data?.message;
        setServerError(msg || 'Invalid username or password.');
      } else if (err.request) {
        setServerError('Cannot connect to the server. Please try again later.');
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight-navy font-sans relative overflow-hidden px-4 py-8">
      {/* Background Accents */}
      <div className="fixed -top-32 -left-32 w-96 h-96 rounded-full bg-veridian-emerald/10 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-80 h-80 rounded-full bg-veridian-sky/10 blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-deep-slate border border-white/10 rounded-container p-10 relative z-10 shadow-card animate-fade-in">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-input bg-veridian-emerald flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Farm Ville</h1>
        </div>

        <h2 className="text-2xl font-semibold text-white mb-2">Welcome back</h2>
        <p className="text-slate-caption text-sm mb-8">Sign in to your account to continue</p>

        {/* Server Error Banner */}
        {serverError && (
          <div
            className="flex items-center gap-3 bg-veridian-rose/10 border border-veridian-rose/30 rounded-input p-4 mb-6"
            role="alert"
          >
            <AlertTriangle className="w-5 h-5 text-veridian-rose flex-shrink-0" />
            <span className="text-veridian-rose text-sm">{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Username Field */}
          <div className="space-y-2">
            <label htmlFor="login-username" className="veridian-label flex items-center gap-2">
              <UserRound className="w-4 h-4 text-veridian-emerald" />
              Username
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="e.g., sef_farm01"
              value={form.username}
              onChange={handleChange}
              disabled={loading}
              className={`veridian-input ${errors.username ? 'border-veridian-rose' : ''}`}
            />
            {errors.username && <p className="veridian-error">{errors.username}</p>}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="login-password" className="veridian-label">
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
              className={`veridian-input ${errors.password ? 'border-veridian-rose' : ''}`}
            />
            {errors.password && <p className="veridian-error">{errors.password}</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full veridian-btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Switch to Register */}
        <p className="text-center mt-8 text-slate-caption text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="veridian-link">
            Create one
          </Link>
        </p>

        {/* Role Info */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-slate-caption mb-2">
            <Shield className="w-3.5 h-3.5 text-veridian-emerald" />
            <span>Role-based access control enabled</span>
          </div>
          <p className="text-xs text-slate-caption/70">
            Admins → Command Center | Handlers → Mobile App
          </p>
        </div>
      </div>
    </div>
  );
}
