'use client';
import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, Timestamp, query, orderBy
} from 'firebase/firestore';
import HouseCard from './HouseCard';
import Modal from './Modal';
import Btn from './Btn';

// ⚠️ Must be outside BuildingSection — defining components inside a parent
// causes them to remount on every keystroke, losing input focus.
function AddHouseForm({ form, onChange }) {
  const fields = [
    { label: 'House / Unit Number *', name: 'houseNumber', type: 'text',   placeholder: 'e.g. A-101, Flat 3B' },
    { label: 'Tenant Name *',         name: 'tenantName',  type: 'text',   placeholder: 'Full name' },
    { label: 'Phone Number',          name: 'phoneNumber', type: 'tel',    placeholder: '+92 300 0000000' },
    { label: 'Monthly Rent (PKR) *',  name: 'monthlyRent', type: 'number', placeholder: 'e.g. 15000' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {fields.map(({ label, name, type, placeholder }) => (
        <div key={name}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>
            {label}
          </label>
          <input
            type={type}
            value={form[name]}
            placeholder={placeholder}
            autoComplete="off"
            onChange={e => onChange(name, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

export default function BuildingSection({ userId, building, onDelete }) {
  const [houses, setHouses]       = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded]   = useState(true);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    houseNumber: '', tenantName: '', phoneNumber: '', monthlyRent: ''
  });

  useEffect(() => {
    const path = `users/${userId}/buildings/${building.id}/houses`;
    const q = query(collection(db, path), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setHouses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [userId, building.id]);

  const handleFieldChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddHouse = async () => {
    if (!form.houseNumber || !form.tenantName || !form.monthlyRent) return;
    setSaving(true);
    try {
      const path = `users/${userId}/buildings/${building.id}/houses`;
      await addDoc(collection(db, path), {
        ...form,
        monthlyRent: Number(form.monthlyRent),
        createdAt: Timestamp.now()
      });
      setForm({ houseNumber: '', tenantName: '', phoneNumber: '', monthlyRent: '' });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHouse = async (houseId) => {
    if (!confirm('Remove this house and all its payment records?')) return;
    await deleteDoc(doc(db, `users/${userId}/buildings/${building.id}/houses/${houseId}`));
  };

  return (
    <>
      <div style={{
        background: 'var(--paper-card)', borderRadius: 'var(--radius-lg)',
        border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden'
      }}>
        {/* Building Header */}
        <div
          style={{
            padding: '18px 20px', background: 'var(--ink)', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer'
          }}
          onClick={() => setExpanded(e => !e)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0
            }}>🏢</div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#fff', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {building.name}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>
                {houses.length} house{houses.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={e => { e.stopPropagation(); setShowModal(true); }}
              style={{
                background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8,
                padding: '6px 12px', fontSize: '0.8rem', fontFamily: 'Syne, sans-serif', fontWeight: 600,
                cursor: 'pointer', transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              + House
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{
                background: 'rgba(255,100,100,0.18)', color: '#fca5a5', border: 'none', borderRadius: 8,
                padding: '6px 12px', fontSize: '0.8rem', fontFamily: 'Syne, sans-serif', fontWeight: 600,
                cursor: 'pointer', transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,100,100,0.30)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,100,100,0.18)'}
            >
              Delete
            </button>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', userSelect: 'none' }}>
              {expanded ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {/* Houses Grid */}
        {expanded && (
          <div style={{ padding: '20px' }}>
            {houses.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '32px 16px',
                border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>🏠</div>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
                  No houses added yet.
                </p>
                <Btn variant="accent" size="sm" onClick={() => setShowModal(true)}>
                  + Add First House
                </Btn>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 14
              }}>
                {houses.map(house => (
                  <HouseCard
                    key={house.id}
                    userId={userId}
                    buildingId={building.id}
                    house={house}
                    onDelete={() => handleDeleteHouse(house.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add House Modal */}
      {showModal && (
        <Modal title={`Add House — ${building.name}`} onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AddHouseForm form={form} onChange={handleFieldChange} />
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <Btn variant="ghost" onClick={() => setShowModal(false)} fullWidth>Cancel</Btn>
              <Btn
                variant="primary"
                onClick={handleAddHouse}
                disabled={saving || !form.houseNumber || !form.tenantName || !form.monthlyRent}
                fullWidth
              >
                {saving ? 'Adding…' : 'Add House'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}