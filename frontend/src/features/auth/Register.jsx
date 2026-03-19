// src/features/auth/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, saveUserSession } from './authService';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { updateCachedUser } = useAuth();

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

  // ── Field-level validation ──────────────────────────────────
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
      // ── KEY REQUIREMENT: password === confirmPassword check ──
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

  // ── Submit handler ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate ALL fields including password match BEFORE calling API
    if (!validate()) return;

    setLoading(true);
    setServerError('');

    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        password: form.password,  // confirmPassword is NOT sent to API
      };

      const response = await registerUser(payload);

      if (response.success) {
        // Save session and redirect to dashboard
        saveUserSession(response.data);
        updateCachedUser(response.data);
        navigate('/dashboard');
      } else {
        setServerError(response.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      if (err.response) {
        const msg = err.response.data?.message;
        if (err.response.status === 409) {
          // Conflict – user already exists
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
    if (p.length < 6) return { label: 'Weak', color: '#ef4444', width: '33%' };
    if (p.length < 10) return { label: 'Medium', color: '#f59e0b', width: '66%' };
    return { label: 'Strong', color: '#10b981', width: '100%' };
  };

  const strength = passwordStrength();

  return (
    <div style={styles.page}>
      <div style={styles.bgAccent1} />
      <div style={styles.bgAccent2} />

      <div style={styles.card}>
        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.logoRing}>
            <span style={styles.logoIcon}>⬡</span>
          </div>
          <h1 style={styles.brandName}>Farm Ville</h1>
        </div>

        <h2 style={styles.title}>Create your account</h2>
        <p style={styles.subtitle}>Join us today — it's free and quick</p>

        {/* Server error banner */}
        {serverError && (
          <div style={styles.errorBanner} role="alert">
            <span style={styles.errorIcon}>⚠</span>
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          {/* Username */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="reg-username">Username <span style={styles.required}>*</span></label>
            <input
              id="reg-username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="johndoe"
              value={form.username}
              onChange={handleChange}
              style={{ ...styles.input, ...(errors.username ? styles.inputError : {}) }}
              disabled={loading}
            />
            {errors.username && <p style={styles.fieldError}>{errors.username}</p>}
          </div>

          {/* Full Name */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="reg-fullname">
              Full Name <span style={styles.optional}>(optional)</span>
            </label>
            <input
              id="reg-fullname"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="John Doe"
              value={form.fullName}
              onChange={handleChange}
              style={styles.input}
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="reg-email">Email <span style={styles.required}>*</span></label>
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              style={{ ...styles.input, ...(errors.email ? styles.inputError : {}) }}
              disabled={loading}
            />
            {errors.email && <p style={styles.fieldError}>{errors.email}</p>}
          </div>

          {/* Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="reg-password">Password <span style={styles.required}>*</span></label>
            <input
              id="reg-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handleChange}
              style={{ ...styles.input, ...(errors.password ? styles.inputError : {}) }}
              disabled={loading}
            />
            {/* Password strength indicator */}
            {strength && (
              <div style={styles.strengthWrapper}>
                <div style={styles.strengthBar}>
                  <div style={{ ...styles.strengthFill, width: strength.width, background: strength.color }} />
                </div>
                <span style={{ ...styles.strengthLabel, color: strength.color }}>{strength.label}</span>
              </div>
            )}
            {errors.password && <p style={styles.fieldError}>{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="reg-confirm">Confirm Password <span style={styles.required}>*</span></label>
            <input
              id="reg-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={handleChange}
              style={{ ...styles.input, ...(errors.confirmPassword ? styles.inputError : {}) }}
              disabled={loading}
            />
            {/* Password match status */}
            {form.confirmPassword && !errors.confirmPassword && form.password === form.confirmPassword && (
              <p style={{ ...styles.fieldError, color: '#10b981' }}>✓ Passwords match</p>
            )}
            {errors.confirmPassword && <p style={styles.fieldError}>{errors.confirmPassword}</p>}
          </div>

          {/* Submit */}
          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? <span style={styles.spinner} /> : 'Create Account'}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

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
    padding: '40px 20px',
  },
  bgAccent1: {
    position: 'fixed',
    top: '-100px',
    right: '-100px',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgAccent2: {
    position: 'fixed',
    bottom: '-80px',
    left: '-80px',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
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
    marginBottom: '24px',
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
  logoIcon: { fontSize: '18px', color: '#fff' },
  brandName: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 6px',
    letterSpacing: '-0.5px',
  },
  subtitle: { fontSize: '14px', color: '#666', margin: '0 0 24px' },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '18px',
    color: '#f87171',
    fontSize: '14px',
  },
  errorIcon: { fontSize: '16px', flexShrink: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '500', color: '#aaa', letterSpacing: '0.2px' },
  required: { color: '#f87171' },
  optional: { color: '#555', fontSize: '11px' },
  input: {
    background: '#1c1c27',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  inputError: { borderColor: 'rgba(239,68,68,0.5)' },
  fieldError: { fontSize: '12px', color: '#f87171', margin: 0 },
  strengthWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '4px',
  },
  strengthBar: {
    flex: 1,
    height: '4px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '99px',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: '99px',
    transition: 'width 0.3s ease, background 0.3s ease',
  },
  strengthLabel: { fontSize: '11px', fontWeight: '600', minWidth: '44px' },
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
    letterSpacing: '0.2px',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    display: 'inline-block',
  },
  switchText: { textAlign: 'center', marginTop: '22px', fontSize: '14px', color: '#666' },
  link: { color: '#818cf8', textDecoration: 'none', fontWeight: '500' },
};
