// src/features/dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserSession, clearUserSession, getProfilePhotoUrl, getProfile } from '../auth/authService';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    const session = getUserSession();
    if (!session) {
      navigate('/login');
      return;
    }
    setUser(session);

    // Optionally fetch fresh profile from API
    getProfile(session.id)
      .then((res) => { if (res.success) setProfileData(res.data); })
      .catch(() => {}); // Silently fail - use session data
  }, [navigate]);

  const handleLogout = () => {
    clearUserSession();
    navigate('/login');
  };

  if (!user) return null;

  const displayName = profileData?.fullName || user.fullName || user.username;
  const avatarUrl = user.hasProfileImage ? getProfilePhotoUrl(user.id) : null;

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarBrand}>
          <div style={styles.logoRing}>⬡</div>
          <span style={styles.brandName}>Farm Ville</span>
        </div>

        <nav style={styles.nav}>
          {['Dashboard', 'Profile', 'Settings'].map((item) => (
            <div
              key={item}
              style={{
                ...styles.navItem,
                ...(item === 'Dashboard' ? styles.navItemActive : {}),
              }}
            >
              <span style={styles.navIcon}>
                {item === 'Dashboard' ? '⊞' : item === 'Profile' ? '◉' : '⚙'}
              </span>
              {item}
            </div>
          ))}
        </nav>

        <button onClick={handleLogout} style={styles.logoutBtn}>
          <span>↩</span> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>Dashboard</h1>
            <p style={styles.headerSub}>Welcome back, {displayName}!</p>
          </div>
          <div style={styles.avatar}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                style={styles.avatarImg}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <span style={styles.avatarInitial}>
                {(displayName || 'U')[0].toUpperCase()}
              </span>
            )}
          </div>
        </header>

        {/* Stats cards */}
        <div style={styles.statsGrid}>
          {[
            { label: 'Account Status', value: 'Active', color: '#10b981', icon: '✓' },
            { label: 'User ID', value: `#${user.id}`, color: '#6366f1', icon: '⊕' },
            { label: 'Member Since', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Today', color: '#f59e0b', icon: '◷' },
          ].map((stat) => (
            <div key={stat.label} style={styles.statCard}>
              <div style={{ ...styles.statIcon, color: stat.color }}>{stat.icon}</div>
              <div>
                <p style={styles.statLabel}>{stat.label}</p>
                <p style={{ ...styles.statValue, color: stat.color }}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Profile info card */}
        <div style={styles.profileCard}>
          <h3 style={styles.cardTitle}>Profile Information</h3>
          <div style={styles.profileGrid}>
            {[
              { label: 'Username', value: user.username },
              { label: 'Email', value: user.email },
              { label: 'Full Name', value: user.fullName || '—' },
              { label: 'Phone', value: user.phone || '—' },
            ].map((field) => (
              <div key={field.label} style={styles.profileField}>
                <span style={styles.profileFieldLabel}>{field.label}</span>
                <span style={styles.profileFieldValue}>{field.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Success notice */}
        <div style={styles.successBanner}>
          <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
          <div>
            <p style={styles.successTitle}>Login Successful</p>
            <p style={styles.successSub}>
              You are authenticated via Spring Boot + Supabase PostgreSQL. No JWT token was used.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    background: '#0a0a0f',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    color: '#fff',
  },
  sidebar: {
    width: '220px',
    flexShrink: 0,
    background: '#13131a',
    borderRight: '1px solid rgba(255,255,255,0.07)',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 16px',
    gap: '8px',
  },
  sidebarBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '32px',
    paddingLeft: '8px',
  },
  logoRing: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #6366f1, #10b981)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    color: '#fff',
  },
  brandName: { fontSize: '16px', fontWeight: '700', color: '#fff' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#666',
    cursor: 'pointer',
  },
  navItemActive: {
    background: 'rgba(99,102,241,0.15)',
    color: '#818cf8',
  },
  navIcon: { fontSize: '16px' },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#666',
    padding: '10px 12px',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: 'auto',
  },
  main: {
    flex: 1,
    padding: '40px 48px',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '36px',
  },
  headerTitle: { fontSize: '28px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '-0.5px' },
  headerSub: { fontSize: '14px', color: '#666', margin: 0 },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #10b981)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInitial: { color: '#fff' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: '#13131a',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statIcon: { fontSize: '24px' },
  statLabel: { fontSize: '12px', color: '#666', margin: '0 0 4px' },
  statValue: { fontSize: '18px', fontWeight: '700', margin: 0 },
  profileCard: {
    background: '#13131a',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    padding: '24px',
    marginBottom: '20px',
  },
  cardTitle: { fontSize: '16px', fontWeight: '600', margin: '0 0 20px', color: '#ccc' },
  profileGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  profileField: { display: 'flex', flexDirection: 'column', gap: '4px' },
  profileFieldLabel: { fontSize: '12px', color: '#555' },
  profileFieldValue: { fontSize: '15px', color: '#ddd' },
  successBanner: {
    background: 'rgba(16,185,129,0.08)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '12px',
    padding: '18px 22px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
  },
  successTitle: { fontSize: '14px', fontWeight: '600', color: '#10b981', margin: '0 0 4px' },
  successSub: { fontSize: '13px', color: '#555', margin: 0 },
};
