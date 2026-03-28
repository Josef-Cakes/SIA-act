// src/features/auth/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, Loader2, Leaf, Check } from 'lucide-react';
import { registerUser } from './authService';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { applyAuthenticatedUser } = useAuth();

  const [form, setForm] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const routeByRole = (role) => {
    const normalizedRole = typeof role === 'string' ? role.toUpperCase() : '';

    if (normalizedRole === 'ROLE_ADMIN' || normalizedRole === 'ADMIN') {
      navigate('/admin');
      return;
    }

    if (normalizedRole === 'ROLE_HANDLER' || normalizedRole === 'HANDLER') {
      navigate('/mobile');
      return;
    }

    navigate('/dashboard');
  };

  // Field-level validation
  const validate = () => {
    const newErrors = {};

    if (!form.username.trim()) {
      newErrors.username = 'Username is required.';
    } else if (form.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    } else if (form.username.trim().length > 50) {
      newErrors.username = 'Username must not exceed 50 characters.';
    } else if (!/^[a-zA-Z0-9._]+$/.test(form.username.trim())) {
      newErrors.username = 'Usernames can contain letters, numbers, underscores, and dots.';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!form.password) {
      newErrors.password = 'Password is required.';
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
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

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setServerError('');

    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        password: form.password,
      };

      const response = await registerUser(payload);

      if (response.success) {
        const authenticatedUser = await applyAuthenticatedUser(response.data);
        routeByRole(authenticatedUser?.role || response.data?.role);
      } else {
        setServerError(response.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      if (err.response) {
        const msg = err.response.data?.message;
        if (err.response.status === 409) {
          setServerError(msg || 'An account with this email or username already exists.');
        } else {
          setServerError(msg || 'Registration failed. Please try again.');
        }
      } else if (err.request) {
        setServerError('Cannot connect to the server. Please try again later.');
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6) return { label: 'Weak', color: 'bg-veridian-rose', textColor: 'text-veridian-rose', width: '33%' };
    if (p.length < 10) return { label: 'Medium', color: 'bg-veridian-amber', textColor: 'text-veridian-amber', width: '66%' };
    return { label: 'Strong', color: 'bg-veridian-emerald', textColor: 'text-veridian-emerald', width: '100%' };
  };

  const strength = passwordStrength();
  const passwordsMatch = form.confirmPassword && !errors.confirmPassword && form.password === form.confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight-navy font-sans relative overflow-hidden px-4 py-10">
      {/* Background Accents */}
      <div className="fixed -top-24 -right-24 w-96 h-96 rounded-full bg-veridian-emerald/10 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-20 -left-20 w-72 h-72 rounded-full bg-veridian-sky/10 blur-3xl pointer-events-none" />

      {/* Register Card */}
      <div className="w-full max-w-md bg-deep-slate border border-white/10 rounded-container p-10 relative z-10 shadow-card animate-fade-in">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-input bg-veridian-emerald flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Farm Ville</h1>
        </div>

        <h2 className="text-2xl font-semibold text-white mb-2">Create your account</h2>
        <p className="text-slate-caption text-sm mb-6">Join us today — it's free and quick</p>

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

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Username Field */}
          <div className="space-y-2">
            <label htmlFor="reg-username" className="veridian-label">
              Username <span className="text-veridian-rose">*</span>
            </label>
            <input
              id="reg-username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="johndoe"
              value={form.username}
              onChange={handleChange}
              disabled={loading}
              className={`veridian-input ${errors.username ? 'border-veridian-rose' : ''}`}
            />
            {errors.username && <p className="veridian-error">{errors.username}</p>}
          </div>

          {/* Full Name Field */}
          <div className="space-y-2">
            <label htmlFor="reg-fullname" className="veridian-label">
              Full Name <span className="text-slate-caption/60 text-xs">(optional)</span>
            </label>
            <input
              id="reg-fullname"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="John Doe"
              value={form.fullName}
              onChange={handleChange}
              disabled={loading}
              className="veridian-input"
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="reg-email" className="veridian-label">
              Email <span className="text-veridian-rose">*</span>
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
              className={`veridian-input ${errors.email ? 'border-veridian-rose' : ''}`}
            />
            {errors.email && <p className="veridian-error">{errors.email}</p>}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="reg-password" className="veridian-label">
              Password <span className="text-veridian-rose">*</span>
            </label>
            <input
              id="reg-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
              className={`veridian-input ${errors.password ? 'border-veridian-rose' : ''}`}
            />
            {/* Password Strength Indicator */}
            {strength && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
                <span className={`text-xs font-semibold ${strength.textColor}`}>{strength.label}</span>
              </div>
            )}
            {errors.password && <p className="veridian-error">{errors.password}</p>}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label htmlFor="reg-confirm" className="veridian-label">
              Confirm Password <span className="text-veridian-rose">*</span>
            </label>
            <input
              id="reg-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              className={`veridian-input ${errors.confirmPassword ? 'border-veridian-rose' : ''}`}
            />
            {/* Password Match Indicator */}
            {passwordsMatch && (
              <p className="flex items-center gap-1 text-veridian-emerald text-sm">
                <Check className="w-4 h-4" />
                Passwords match
              </p>
            )}
            {errors.confirmPassword && <p className="veridian-error">{errors.confirmPassword}</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full veridian-btn-primary flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Switch to Login */}
        <p className="text-center mt-6 text-slate-caption text-sm">
          Already have an account?{' '}
          <Link to="/login" className="veridian-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
