'use client';
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';

export interface AppSettings {
  darkMode: boolean;
  showAnalytics: boolean;
  showWhatsApp: boolean;
  showReceipts: boolean;
  showExpenses: boolean;
  showAIAssistant: boolean;
  showPastRecords: boolean;
  showTenantDetails: boolean;
}

export const defaultSettings: AppSettings = {
  darkMode: false,
  showAnalytics: true,
  showWhatsApp: true,
  showReceipts: true,
  showExpenses: true,
  showAIAssistant: true,
  showPastRecords: true,
  showTenantDetails: true,
};

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem('appSettings');
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch (_) {}
  return defaultSettings;
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem('appSettings', JSON.stringify(settings));
}

interface Props {
  user: User;
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
  onSignOut: () => void;
  onClose: () => void;
}

interface ToggleRow {
  key: keyof AppSettings;
  label: string;
  desc: string;
  icon: string;
}

const featureToggles: ToggleRow[] = [
  { key: 'showAnalytics',     label: 'Analytics Header',   desc: 'Show Expected, Collected, Pending, Profit metrics', icon: '📊' },
  { key: 'showAIAssistant',   label: 'AI Assistant',       desc: 'The 🤖 chatbot for voice & text commands',           icon: '🤖' },
  { key: 'showWhatsApp',      label: 'WhatsApp Reminders', desc: 'Send rent reminders via WhatsApp',                  icon: '📱' },
  { key: 'showReceipts',      label: 'Payment Receipts',   desc: 'Auto-generate receipt after logging payment',       icon: '🧾' },
  { key: 'showExpenses',      label: 'Expenses Tracking',  desc: 'Track maintenance and other building costs',        icon: '🔧' },
  { key: 'showPastRecords',   label: 'Past Records',       desc: 'View payment history for each house',               icon: '📋' },
  { key: 'showTenantDetails', label: 'Tenant Details',     desc: 'Click tenant name to open details modal',           icon: '👤' },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: 44, height: 24, borderRadius: 99, flexShrink: 0,
      background: on ? 'var(--accent)' : 'var(--border)',
      border: 'none', cursor: 'pointer', position: 'relative',
      transition: 'background 0.25s', padding: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, left: on ? 23 : 3,
        transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
      }} />
    </button>
  );
}

export default function SettingsModal({ user, settings, onSettingsChange, onSignOut, onClose }: Props) {
  const update = (key: keyof AppSettings, value: boolean) => {
    const next = { ...settings, [key]: value };
    onSettingsChange(next);
    saveSettings(next);
    if (key === 'darkMode') {
      document.documentElement.setAttribute('data-theme', value ? 'dark' : 'light');
    }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,14,13,0.5)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '20px', zIndex: 1000,
      animation: 'fadeIn 0.15s ease',
    }}>
      <div style={{
        background: 'var(--paper-card)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 480,
        border: '1px solid var(--border)', maxHeight: '90vh',
        overflowY: 'auto', animation: 'slideUp 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--paper-card)', zIndex: 1 }}>
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.15rem', color: 'var(--ink)' }}>⚙️ Settings</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--paper-warm)', color: 'var(--ink-soft)', border: 'none', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'var(--paper-warm)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', background: 'var(--accent-soft)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {user.photoURL
                ? <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--accent)', fontSize: '1.3rem' }}>{(user.displayName || user.email || 'U')[0].toUpperCase()}</span>
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--ink)', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName || 'User'}</p>
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
            </div>
          </div>

          {/* Appearance */}
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: 'Syne,sans-serif' }}>Appearance</p>
            <div style={{ background: 'var(--paper-warm)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              {/* Light / Dark toggle with visual selector */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)' }}>Theme</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ label: '☀️ Light', value: false }, { label: '🌙 Dark', value: true }].map(({ label, value }) => (
                    <button key={label} onClick={() => update('darkMode', value)} style={{
                      flex: 1, padding: '12px', borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${settings.darkMode === value ? 'var(--accent)' : 'var(--border)'}`,
                      background: settings.darkMode === value ? 'var(--accent-soft)' : 'var(--paper-card)',
                      color: settings.darkMode === value ? 'var(--accent)' : 'var(--ink-soft)',
                      fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.88rem',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: 'Syne,sans-serif' }}>Features</p>
            <div style={{ background: 'var(--paper-warm)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              {featureToggles.map((item, i) => (
                <div key={item.key} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  background: 'var(--paper-warm)',
                }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{item.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{item.label}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', lineHeight: 1.4 }}>{item.desc}</p>
                  </div>
                  <Toggle on={settings[item.key] as boolean} onToggle={() => update(item.key, !settings[item.key])} />
                </div>
              ))}
            </div>
          </div>

          {/* Sign Out */}
          <button onClick={onSignOut} style={{
            width: '100%', padding: '13px', borderRadius: 'var(--radius-sm)',
            background: 'var(--red-soft)', color: 'var(--red)',
            border: '1.5px solid var(--red-soft)', fontFamily: 'Syne,sans-serif',
            fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.border = '1.5px solid var(--red)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.border = '1.5px solid var(--red-soft)'}
          >
            🚪 Sign Out
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
