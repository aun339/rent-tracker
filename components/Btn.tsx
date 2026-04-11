'use client';

const variants = {
  primary: {
    bg: 'var(--ink)', color: '#fff',
    hover: '#2a2825',
    shadow: 'var(--shadow-sm)'
  },
  accent: {
    bg: 'var(--accent)', color: '#fff',
    hover: 'var(--accent-hover)',
    shadow: 'var(--shadow-sm)'
  },
  ghost: {
    bg: 'var(--paper-warm)', color: 'var(--ink-soft)',
    hover: 'var(--border)', shadow: 'none'
  },
  danger: {
    bg: '#fee2e2', color: '#b91c1c',
    hover: '#fecaca', shadow: 'none'
  },
  green: {
    bg: 'var(--green)', color: '#fff',
    hover: '#235f3d', shadow: 'var(--shadow-sm)'
  },
};

export default function Btn({ children, variant = 'primary', onClick, disabled, size = 'md', fullWidth, style: extraStyle, icon }) {
  const v = variants[variant] || variants.primary;
  const padding = size === 'sm' ? '7px 12px' : size === 'lg' ? '13px 22px' : '10px 16px';
  const fontSize = size === 'sm' ? '0.8rem' : size === 'lg' ? '1rem' : '0.88rem';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding, fontSize, fontFamily: 'Syne, sans-serif', fontWeight: 600,
        borderRadius: 'var(--radius-sm)', background: disabled ? 'var(--paper-warm)' : v.bg,
        color: disabled ? 'var(--ink-muted)' : v.color, cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: v.shadow, display: 'inline-flex', alignItems: 'center', gap: 6,
        justifyContent: 'center', width: fullWidth ? '100%' : 'auto',
        transition: 'all 0.15s ease', whiteSpace: 'nowrap', ...extraStyle
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = v.hover; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = v.bg; }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}
