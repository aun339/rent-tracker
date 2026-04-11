'use client';
import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import {
  collection, query, where, Timestamp, onSnapshot,
  addDoc, deleteDoc, doc
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

export default function HouseCard({ userId, buildingId, house, onDelete }) {
  const [payments, setPayments] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

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
  const pending = house.monthlyRent - totalPaid;
  const fullyPaid = pending <= 0;

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
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{
        background: 'var(--paper-card)', borderRadius: 'var(--radius)',
        border: `1.5px solid ${fullyPaid ? '#bbf7d0' : 'var(--border)'}`,
        boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
        transition: 'box-shadow 0.18s ease',
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
            </div>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.88rem', marginTop: 2 }}>
              👤 {house.tenantName}
            </p>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
              📞 {house.phoneNumber}
            </p>
          </div>
          <button
            onClick={onDelete}
            title="Remove house"
            style={{
              background: 'var(--paper-warm)', color: 'var(--ink-muted)', border: 'none',
              borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer',
              flexShrink: 0, transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#b91c1c'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--paper-warm)'; e.currentTarget.style.color = 'var(--ink-muted)'; }}
          >
            Remove
          </button>
        </div>

        {/* Rent Summary */}
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Monthly Rent', val: house.monthlyRent, color: 'var(--ink)' },
              { label: 'Paid This Month', val: totalPaid, color: 'var(--green)' },
              { label: pending > 0 ? 'Pending' : 'Overpaid', val: Math.abs(pending), color: pending > 0 ? 'var(--amber)' : 'var(--green)' },
            ].map(item => (
              <div key={item.label} style={{
                background: 'var(--paper-warm)', borderRadius: 'var(--radius-sm)',
                padding: '10px 10px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: item.color, fontFamily: 'Syne, sans-serif' }}>
                  {Number(item.val).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--ink-muted)', marginTop: 2, lineHeight: 1.3 }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ height: 6, background: 'var(--paper-warm)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99, transition: 'width 0.4s ease',
                background: fullyPaid ? 'var(--green)' : 'var(--accent)',
                width: `${Math.min(100, (totalPaid / house.monthlyRent) * 100)}%`
              }} />
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: 5, textAlign: 'right' }}>
              {Math.min(100, Math.round((totalPaid / house.monthlyRent) * 100))}% of rent collected
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variant="accent" size="sm" onClick={() => setShowPayModal(true)} icon="💳">
              Log Payment
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => setShowHistory(true)} icon="📋">
              Past Records
            </Btn>
          </div>
        </div>
      </div>

      {/* Log Payment Modal */}
      {showPayModal && (
        <Modal title={`Log Payment — ${house.houseNumber}`} onClose={() => setShowPayModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>
                Amount Paid (PKR)
              </label>
              <input
                type="number" min="1" value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder={`Max: ${Number(house.monthlyRent).toLocaleString()}`}
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>
                Payment Date
              </label>
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

      {/* Payment History Modal */}
      {showHistory && (
        <PaymentHistory
          userId={userId}
          buildingId={buildingId}
          houseId={house.id}
          houseName={house.houseNumber}
          monthlyRent={house.monthlyRent}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
