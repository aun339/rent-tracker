'use client';
import { auth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError('Sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--paper)', padding: '24px',
      backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(200,83,26,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(200,83,26,0.04) 0%, transparent 50%)'
    }}>
      <div style={{
        background: 'var(--paper-card)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)', padding: '48px 40px', maxWidth: 420, width: '100%',
        border: '1px solid var(--border)', textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{
          width: 56, height: 56, background: 'var(--ink)', borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: '1.5rem'
        }}>🏢</div>

        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
          RentTrack
        </h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', marginBottom: 36, lineHeight: 1.6 }}>
          Manage your buildings, tenants &amp; rent collection — all in one place.
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '13px 20px', borderRadius: 'var(--radius-sm)',
            background: loading ? 'var(--paper-warm)' : 'var(--ink)',
            color: loading ? 'var(--ink-muted)' : '#fff',
            fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.95rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.18s ease',
            boxShadow: loading ? 'none' : 'var(--shadow-sm)'
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2a2825'; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--ink)'; }}
        >
          {loading ? (
            <>
              <span style={{ width: 18, height: 18, border: '2px solid var(--border-dark)', borderTopColor: 'var(--ink-muted)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              Signing in…
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {error && (
          <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginTop: 16, padding: '10px 14px', background: 'var(--accent-soft)', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </p>
        )}

        <p style={{ color: 'var(--ink-muted)', fontSize: '0.78rem', marginTop: 28, lineHeight: 1.5 }}>
          Your data is private and stored securely in Firestore.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
