// src/features/auth/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, saveUserSession } from './authService';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { updateCachedUser } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Field-level validation ──────────────────────────────────
  const validate = () => {
    const newErrors = {};

    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.';
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
    // Clear field error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  // ── Submit handler ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError('');

    try {
      const response = await loginUser({ email: form.email, password: form.password });

      if (response.success) {
        // Save user details to session (no JWT needed)
        saveUserSession(response.data);
        updateCachedUser(response.data);
        navigate('/dashboard');
      } else {
        // Spring Boot returned success: false
        setServerError(response.message || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      if (err.response) {
        // HTTP error response from Spring Boot
        const msg = err.response.data?.message;
        setServerError(msg || 'Invalid credentials. Please try again.');
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
    <div style={styles.page}>
      {/* Background accents */}
      <div style={styles.bgAccent1} />
      <div style={styles.bgAccent2} />

      <div style={styles.card}>
        {/* Logo / Brand */}
        <div style={styles.brand}>
          <div style={styles.logoRing}>
            <span style={styles.logoIcon}>⬡</span>
          </div>
          <h1 style={styles.brandName}>Farm Ville</h1>
        </div>

        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.subtitle}>Sign in to your account to continue</p>

        {/* Server-level error banner */}
        {serverError && (
          <div style={styles.errorBanner} role="alert">
            <span style={styles.errorIcon}>⚠</span>
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          {/* Email */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              style={{
                ...styles.input,
                ...(errors.email ? styles.inputError : {}),
              }}
              disabled={loading}
            />
            {errors.email && <p style={styles.fieldError}>{errors.email}</p>}
          </div>

          {/* Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              style={{
                ...styles.input,
                ...(errors.password ? styles.inputError : {}),
              }}
              disabled={loading}
            />
            {errors.password && <p style={styles.fieldError}>{errors.password}</p>}
          </div>

          {/* Submit button */}
          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? (
              <span style={styles.spinner} />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p style={styles.switchText}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0f',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    position: 'relative',
    overflow: 'hidden',
    padding: '20px',
  },
  bgAccent1: {
    position: 'fixed',
    top: '-120px',
    left: '-120px',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgAccent2: {
    position: 'fixed',
    bottom: '-100px',
    right: '-100px',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16,185,129,0.13) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#13131a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '44px 40px',
    position: 'relative',
    zIndex: 1,
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '28px',
  },
  logoRing: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #6366f1, #10b981)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: '18px',
    color: '#fff',
  },
  brandName: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  title: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 6px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 28px',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '20px',
    color: '#f87171',
    fontSize: '14px',
  },
  errorIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#aaa',
    letterSpacing: '0.2px',
  },
  input: {
    background: '#1c1c27',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: 'rgba(239,68,68,0.5)',
  },
  fieldError: {
    fontSize: '12px',
    color: '#f87171',
    margin: 0,
  },
  submitBtn: {
    marginTop: '6px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s',
    letterSpacing: '0.2px',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
  switchText: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '14px',
    color: '#666',
  },
  link: {
    color: '#818cf8',
    textDecoration: 'none',
    fontWeight: '500',
  },
};
