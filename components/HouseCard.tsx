'use client';
import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import {
  collection, query, where, Timestamp, onSnapshot,
  addDoc, deleteDoc, doc, updateDoc
} from 'firebase/firestore';
import Modal from './Modal';
import Btn from './Btn';
import PaymentHistory from './PaymentHistory';

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

// Edit form outside to prevent focus loss
function EditHouseForm({ form, onChange }) {
  const fields = [
    { label: 'House / Unit Number *', name: 'houseNumber', type: 'text', placeholder: 'e.g. A-101' },
    { label: 'Tenant Name', name: 'tenantName', type: 'text', placeholder: 'Full name' },
    { label: 'Phone Number', name: 'phoneNumber', type: 'tel', placeholder: '+92 300 0000000' },
    { label: 'Monthly Rent (PKR)', name: 'monthlyRent', type: 'number', placeholder: 'e.g. 15000' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {fields.map(({ label, name, type, placeholder }) => (
        <div key={name}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>{label}</label>
          <input type={type} value={form[name]} placeholder={placeholder} autoComplete="off"
            onChange={e => onChange(name, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

export default function HouseCard({ userId, buildingId, house, onDelete }) {
  const [payments, setPayments] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    houseNumber: house.houseNumber || '',
    tenantName: house.tenantName || '',
    phoneNumber: house.phoneNumber || '',
    monthlyRent: house.monthlyRent || '',
  });

  useEffect(() => {
    const { start, end } = getMonthRange();
    const path = `users/${userId}/buildings/${buildingId}/houses/${house.id}/payments`;
    const q = query(collection(db, path), where('date', '>=', start), where('date', '<', end));
    const unsub = onSnapshot(q, snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [userId, buildingId, house.id]);

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const pending = (house.monthlyRent || 0) - totalPaid;
  const fullyPaid = house.monthlyRent > 0 && pending <= 0;

  const handleAddPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) return;
    setSaving(true);
    try {
      const path = `users/${userId}/buildings/${buildingId}/houses/${house.id}/payments`;
      await addDoc(collection(db, path), {
        amount: Number(payAmount),
        date: Timestamp.fromDate(new Date(payDate + 'T00:00:00')),
        createdAt: Timestamp.now()
      });
      setPayAmount('');
      setShowPayModal(false);
    } finally { setSaving(false); }
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const path = `users/${userId}/buildings/${buildingId}/houses/${house.id}`;
      await updateDoc(doc(db, path), {
        houseNumber: editForm.houseNumber,
        tenantName: editForm.tenantName,
        phoneNumber: editForm.phoneNumber,
        monthlyRent: Number(editForm.monthlyRent) || 0,
      });
      setShowEditModal(false);
    } finally { setSaving(false); }
  };

  const handleEditChange = (name, value) => setEditForm(prev => ({ ...prev, [name]: value }));

  const noTenant = !house.tenantName;

  return (
    <>
      <div style={{
        background: 'var(--paper-card)', borderRadius: 'var(--radius)',
        border: `1.5px solid ${fullyPaid ? '#bbf7d0' : noTenant ? 'var(--border)' : 'var(--border)'}`,
        boxShadow: 'var(--shadow-sm)', overflow: 'hidden', transition: 'box-shadow 0.18s ease',
      }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
      >
        {/* Card Header */}
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
          background: fullyPaid ? 'rgba(45,122,79,0.04)' : 'var(--paper-card)'
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h4 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)' }}>
                {house.houseNumber}
              </h4>
              {fullyPaid && (
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'var(--green-soft)', color: 'var(--green)', fontWeight: 700 }}>
                  ✓ PAID
                </span>
              )}
              {noTenant && (
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'var(--amber-soft)', color: 'var(--amber)', fontWeight: 700 }}>
                  Setup needed
                </span>
              )}
            </div>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.88rem', marginTop: 2 }}>
              {house.tenantName ? `👤 ${house.tenantName}` : '👤 No tenant yet'}
            </p>
            {house.phoneNumber ? <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>📞 {house.phoneNumber}</p> : null}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => { setEditForm({ houseNumber: house.houseNumber || '', tenantName: house.tenantName || '', phoneNumber: house.phoneNumber || '', monthlyRent: house.monthlyRent || '' }); setShowEditModal(true); }}
              title="Edit house"
              style={{
                background: 'var(--paper-warm)', color: 'var(--ink-soft)', border: 'none',
                borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--paper-warm)'}
            >✏️ Edit</button>
            <button
              onClick={onDelete}
              style={{
                background: 'var(--paper-warm)', color: 'var(--ink-muted)', border: 'none',
                borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#b91c1c'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--paper-warm)'; e.currentTarget.style.color = 'var(--ink-muted)'; }}
            >Remove</button>
          </div>
        </div>

        {/* Rent Summary */}
        <div style={{ padding: '14px 16px' }}>
          {house.monthlyRent > 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'Monthly Rent', val: house.monthlyRent, color: 'var(--ink)' },
                  { label: 'Paid This Month', val: totalPaid, color: 'var(--green)' },
                  { label: pending > 0 ? 'Pending' : 'Overpaid', val: Math.abs(pending), color: pending > 0 ? 'var(--amber)' : 'var(--green)' },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--paper-warm)', borderRadius: 'var(--radius-sm)', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: item.color, fontFamily: 'Syne, sans-serif' }}>
                      {Number(item.val).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--ink-muted)', marginTop: 2, lineHeight: 1.3 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ height: 6, background: 'var(--paper-warm)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.4s ease', background: fullyPaid ? 'var(--green)' : 'var(--accent)', width: `${Math.min(100, (totalPaid / house.monthlyRent) * 100)}%` }} />
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: 5, textAlign: 'right' }}>
                  {Math.min(100, Math.round((totalPaid / house.monthlyRent) * 100))}% collected
                </p>
              </div>
            </>
          ) : (
            <div style={{ padding: '10px 0 14px', textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginBottom: 8 }}>Rent not set yet</p>
              <Btn variant="ghost" size="sm" onClick={() => { setEditForm({ houseNumber: house.houseNumber || '', tenantName: house.tenantName || '', phoneNumber: house.phoneNumber || '', monthlyRent: '' }); setShowEditModal(true); }}>
                ✏️ Set up house
              </Btn>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variant="accent" size="sm" onClick={() => setShowPayModal(true)} icon="💳">Log Payment</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setShowHistory(true)} icon="📋">Past Records</Btn>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <Modal title={`Edit House — ${house.houseNumber}`} onClose={() => setShowEditModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <EditHouseForm form={editForm} onChange={handleEditChange} />
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <Btn variant="ghost" onClick={() => setShowEditModal(false)} fullWidth>Cancel</Btn>
              <Btn variant="primary" onClick={handleEditSave} disabled={saving || !editForm.houseNumber} fullWidth>
                {saving ? 'Saving…' : 'Save Changes'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Log Payment Modal */}
      {showPayModal && (
        <Modal title={`Log Payment — ${house.houseNumber}`} onClose={() => setShowPayModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Amount Paid (PKR)</label>
              <input type="number" min="1" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={`Rent: ${Number(house.monthlyRent || 0).toLocaleString()}`} autoFocus />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Payment Date</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <Btn variant="ghost" onClick={() => setShowPayModal(false)} fullWidth>Cancel</Btn>
              <Btn variant="green" onClick={handleAddPayment} disabled={saving || !payAmount} fullWidth>
                {saving ? 'Saving…' : 'Save Payment'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment History */}
      {showHistory && (
        <PaymentHistory userId={userId} buildingId={buildingId} houseId={house.id} houseName={house.houseNumber} monthlyRent={house.monthlyRent} onClose={() => setShowHistory(false)} />
      )}
    </>
  );
}
