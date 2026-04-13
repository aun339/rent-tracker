'use client';
import { auth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState, useEffect } from 'react';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDark(true); document.documentElement.setAttribute('data-theme','dark'); }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleGoogleLogin = async () => {
    setLoading(true); setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch {
      setError('Sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--paper)', padding: '24px', position: 'relative',
      backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(200,83,26,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(200,83,26,0.05) 0%, transparent 50%)'
    }}>

      {/* Theme toggle top right */}
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <ThemeToggle dark={dark} onToggle={toggleTheme} />
      </div>

      <div style={{
        background: 'var(--paper-card)', borderRadius: 24,
        boxShadow: 'var(--shadow-lg)', padding: '52px 44px', maxWidth: 440, width: '100%',
        border: '1px solid var(--border)', textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{
          width: 72, height: 72, background: 'var(--ink)', borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px', fontSize: '2rem', boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }}>🏢</div>

        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
          RentTrack
        </h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', marginBottom: 10, lineHeight: 1.6 }}>
          Manage your buildings, tenants &amp; rent collection
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
          {['🏢 Buildings','🏠 Houses','💰 Payments','🤖 AI Assistant'].map(f => (
            <span key={f} style={{
              fontSize: '0.75rem', padding: '4px 12px', borderRadius: 99,
              background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600
            }}>{f}</span>
          ))}
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '15px 20px', borderRadius: 14,
            background: loading ? 'var(--paper-warm)' : 'var(--ink)',
            color: loading ? 'var(--ink-muted)' : '#fff',
            fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(0,0,0,0.15)',
            transition: 'all 0.2s ease', border: 'none',
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'; }}}
          onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.15)'; }}
        >
          {loading ? (
            <><span style={{ width:20,height:20,border:'2px solid var(--border-dark)',borderTopColor:'var(--ink-muted)',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite'}} />&nbsp;Signing in…</>
          ) : (
            <><svg width="20" height="20" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/></svg>Continue with Google</>
          )}
        </button>

        {error && (
          <p style={{ color:'var(--accent)', fontSize:'0.85rem', marginTop:16, padding:'10px 14px', background:'var(--accent-soft)', borderRadius:'var(--radius-sm)' }}>
            {error}
          </p>
        )}
        <p style={{ color:'var(--ink-muted)', fontSize:'0.75rem', marginTop:28 }}>
          Your data is private and stored securely in Firebase.
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
        borderRadius: 99, background: 'var(--paper-card)', border: '1.5px solid var(--border)',
        color: 'var(--ink-soft)', fontSize: '0.82rem', fontFamily: 'Syne,sans-serif', fontWeight: 600,
        cursor: 'pointer', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s ease',
      }}
    >
      <span style={{ fontSize: '1rem' }}>{dark ? '☀️' : '🌙'}</span>
      {dark ? 'Light' : 'Dark'}
      {/* Slider track */}
      <div style={{
        width: 36, height: 20, borderRadius: 99, background: dark ? 'var(--accent)' : 'var(--border)',
        position: 'relative', transition: 'background 0.3s ease', flexShrink: 0,
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3, transition: 'left 0.3s ease',
          left: dark ? 18 : 3, boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
      </div>
    </button>
  );
}
