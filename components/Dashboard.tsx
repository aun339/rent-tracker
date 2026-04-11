'use client';
import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, Timestamp, query, orderBy
} from 'firebase/firestore';
import BuildingSection from './BuildingSection';
import Modal from './Modal';
import Btn from './Btn';

export default function Dashboard({ user, onSignOut }) {
  const [buildings, setBuildings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [buildingName, setBuildingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const uid = user.uid;

  useEffect(() => {
    const q = query(collection(db, `users/${uid}/buildings`), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setBuildings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [uid]);

  const handleAddBuilding = async () => {
    if (!buildingName.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, `users/${uid}/buildings`), {
        name: buildingName.trim(),
        createdAt: Timestamp.now()
      });
      setBuildingName('');
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBuilding = async (buildingId) => {
    if (!confirm('Delete this building and all its data? This cannot be undone.')) return;
    await deleteDoc(doc(db, `users/${uid}/buildings/${buildingId}`));
  };

  const now = new Date();
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Top Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, background: 'var(--paper-card)',
        borderBottom: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 20px',
          height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, background: 'var(--ink)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0
            }}>🏢</div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--ink)' }}>
              RentTrack
            </span>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Btn variant="accent" size="sm" onClick={() => setShowModal(true)} icon="+" style={{ display: 'flex' }}>
              <span style={{ display: 'none', ...(typeof window !== 'undefined' && window.innerWidth > 480 ? { display: 'inline' } : {}) }}>
                Add Building
              </span>
              Building
            </Btn>

            {/* User menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--accent-soft)', border: 'none', cursor: 'pointer',
                  overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {user.photoURL
                  ? <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--accent)', fontSize: '1rem' }}>
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </span>
                }
              </button>
              {menuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  background: 'var(--paper-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
                  padding: '12px', minWidth: 200, zIndex: 200,
                  animation: 'slideUp 0.15s ease'
                }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                    {user.displayName || user.email}
                  </p>
                  <button
                    onClick={() => { setMenuOpen(false); onSignOut(); }}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      background: '#fee2e2', color: '#b91c1c', border: 'none',
                      fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.85rem',
                      cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Click outside to close menu */}
      {menuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 60px' }}>
        {/* Page Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem' }}>
            Showing rent status for <strong style={{ color: 'var(--ink-soft)' }}>{monthLabel}</strong>
          </p>
        </div>

        {/* Buildings */}
        {buildings.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)',
            background: 'var(--paper-card)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏢</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
              No buildings yet
            </h2>
            <p style={{ color: 'var(--ink-muted)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
              Add your first building to start tracking rent collection.
            </p>
            <Btn variant="accent" size="lg" onClick={() => setShowModal(true)} icon="🏢">
              Add Your First Building
            </Btn>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {buildings.map(building => (
              <BuildingSection
                key={building.id}
                userId={uid}
                building={building}
                onDelete={() => handleDeleteBuilding(building.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Building Modal */}
      {showModal && (
        <Modal title="Add Building" onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>
                Building Name *
              </label>
              <input
                type="text" value={buildingName} autoFocus
                onChange={e => setBuildingName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddBuilding(); }}
                placeholder="e.g. Green Valley Apartments"
              />
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <Btn variant="ghost" onClick={() => setShowModal(false)} fullWidth>Cancel</Btn>
              <Btn variant="primary" onClick={handleAddBuilding} disabled={saving || !buildingName.trim()} fullWidth>
                {saving ? 'Adding…' : 'Add Building'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
