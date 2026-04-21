'use client';
import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import HouseCard from './HouseCard';
import Modal from './Modal';
import Btn from './Btn';
import { AppSettings } from './SettingsModal';

interface House { id: string; houseNumber: string; tenantName: string; phoneNumber: string; monthlyRent: number; }
interface Expense { id: string; type: string; amount: number; date: any; }
interface Building { id: string; name: string; }

function AddHouseForm({ form, onChange }: { form: any; onChange: (name: string, value: string) => void }) {
  const fields = [
    { label: 'House / Unit Number *', name: 'houseNumber', type: 'text', placeholder: 'e.g. A-101' },
    { label: 'Tenant Name *', name: 'tenantName', type: 'text', placeholder: 'Full name' },
    { label: 'Phone / WhatsApp', name: 'phoneNumber', type: 'tel', placeholder: '+92 300 0000000' },
    { label: 'Monthly Rent (PKR) *', name: 'monthlyRent', type: 'number', placeholder: 'e.g. 15000' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {fields.map(({ label, name, type, placeholder }) => (
        <div key={name}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>{label}</label>
          <input type={type} value={form[name]} placeholder={placeholder} autoComplete="off" onChange={e => onChange(name, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

export default function BuildingSection({
  userId, building, onDelete, viewMode, settings
}: {
  userId: string;
  building: Building;
  onDelete: () => void;
  viewMode: 'rent' | 'expenses';
  settings: AppSettings;
}) {
  const [houses, setHouses] = useState<House[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ houseNumber: '', tenantName: '', phoneNumber: '', monthlyRent: '' });

  useEffect(() => {
    const q = query(collection(db, `users/${userId}/buildings/${building.id}/houses`), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => setHouses(snap.docs.map(d => ({ id: d.id, ...d.data() } as House))));
  }, [userId, building.id]);

  useEffect(() => {
    if (viewMode !== 'expenses') return;
    const q = query(collection(db, `users/${userId}/buildings/${building.id}/expenses`), orderBy('date', 'desc'));
    return onSnapshot(q, snap => setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))));
  }, [userId, building.id, viewMode]);

  const handleAddHouse = async () => {
    if (!form.houseNumber || !form.tenantName || !form.monthlyRent) return;
    setSaving(true);
    try {
      await addDoc(collection(db, `users/${userId}/buildings/${building.id}/houses`), {
        ...form, monthlyRent: Number(form.monthlyRent), createdAt: Timestamp.now()
      });
      setForm({ houseNumber: '', tenantName: '', phoneNumber: '', monthlyRent: '' });
      setShowModal(false);
    } finally { setSaving(false); }
  };

  const handleDeleteHouse = async (houseId: string) => {
    if (!confirm('Remove this house?')) return;
    await deleteDoc(doc(db, `users/${userId}/buildings/${building.id}/houses/${houseId}`));
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Delete this expense?')) return;
    await deleteDoc(doc(db, `users/${userId}/buildings/${building.id}/expenses/${expenseId}`));
  };

  return (
    <>
      <div style={{ background: 'var(--paper-card)', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🏢</div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: '#fff', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{building.name}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>{houses.length} house{houses.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); setShowModal(true); }}
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: '0.8rem', fontFamily: 'Syne,sans-serif', fontWeight: 600, cursor: 'pointer' }}>
              + House
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{ background: 'rgba(255,80,80,0.2)', color: '#fca5a5', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: '0.8rem', fontFamily: 'Syne,sans-serif', fontWeight: 600, cursor: 'pointer' }}>
              Delete
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {viewMode === 'expenses' ? (
            expenses.length === 0
              ? <p style={{ color: 'var(--ink-muted)', textAlign: 'center', padding: '24px 0' }}>No expenses recorded.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {expenses.map(e => {
                  const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--paper-warm)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.9rem' }}>🔧 {e.type}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 700, color: 'var(--red)', fontFamily: 'Syne,sans-serif' }}>PKR {Number(e.amount).toLocaleString()}</span>
                        <button onClick={() => handleDeleteExpense(e.id)} style={{ background: 'var(--red-soft)', color: 'var(--red)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
          ) : (
            houses.length === 0
              ? <div style={{ textAlign: 'center', padding: '32px 16px', border: '2px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>🏠</div>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', marginBottom: 16 }}>No houses added yet.</p>
                <Btn variant="accent" size="sm" onClick={() => setShowModal(true)}>+ Add First House</Btn>
              </div>
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                {houses.map(house => (
                  <HouseCard
                    key={house.id}
                    userId={userId}
                    buildingId={building.id}
                    buildingName={building.name}
                    house={house}
                    onDelete={() => handleDeleteHouse(house.id)}
                    settings={settings}
                  />
                ))}
              </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal title={`Add House — ${building.name}`} onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AddHouseForm form={form} onChange={(n, v) => setForm(p => ({ ...p, [n]: v }))} />
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <Btn variant="ghost" onClick={() => setShowModal(false)} fullWidth>Cancel</Btn>
              <Btn variant="primary" onClick={handleAddHouse} disabled={saving || !form.houseNumber || !form.tenantName || !form.monthlyRent} fullWidth>
                {saving ? 'Adding…' : 'Add House'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
