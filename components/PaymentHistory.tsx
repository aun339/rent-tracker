'use client';
import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import Modal from './Modal';

function groupByMonth(payments) {
  const groups = {};
  payments.forEach(p => {
    const d = p.date?.toDate ? p.date.toDate() : new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = { label, payments: [], total: 0 };
    groups[key].payments.push(p);
    groups[key].total += Number(p.amount);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function PaymentHistory({ userId, buildingId, houseId, houseName, monthlyRent, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = `users/${userId}/buildings/${buildingId}/houses/${houseId}/payments`;
    const q = query(collection(db, path), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [userId, buildingId, houseId]);

  const handleDelete = async (paymentId) => {
    if (!confirm('Delete this payment record?')) return;
    const path = `users/${userId}/buildings/${buildingId}/houses/${houseId}/payments/${paymentId}`;
    await deleteDoc(doc(db, path));
  };

  const grouped = groupByMonth(payments);

  return (
    <Modal title={`Payment History — ${houseName}`} onClose={onClose} maxWidth={520}>
      {loading ? (
        <p style={{ color: 'var(--ink-muted)', textAlign: 'center', padding: '24px 0' }}>Loading…</p>
      ) : payments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
          <p style={{ color: 'var(--ink-muted)' }}>No payments recorded yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map(([key, group]) => {
            const pending = monthlyRent - group.total;
            return (
              <div key={key}>
                {/* Month Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 10, paddingBottom: 10, borderBottom: '1.5px solid var(--border)'
                }}>
                  <h4 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>
                    {group.label}
                  </h4>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: 99, background: 'var(--green-soft)', color: 'var(--green)', fontWeight: 600 }}>
                      Paid: PKR {group.total.toLocaleString()}
                    </span>
                    <span style={{
                      fontSize: '0.78rem', padding: '3px 10px', borderRadius: 99, fontWeight: 600,
                      background: pending > 0 ? 'var(--amber-soft)' : 'var(--green-soft)',
                      color: pending > 0 ? 'var(--amber)' : 'var(--green)'
                    }}>
                      {pending > 0 ? `Pending: PKR ${pending.toLocaleString()}` : '✓ Fully paid'}
                    </span>
                  </div>
                </div>
                {/* Payment rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.payments.map(p => {
                    const d = p.date?.toDate ? p.date.toDate() : new Date(p.date);
                    return (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'var(--paper-warm)', borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px', gap: 10
                      }}>
                        <div>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>
                            PKR {Number(p.amount).toLocaleString()}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginLeft: 8 }}>
                            {d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(p.id)}
                          title="Delete payment"
                          style={{
                            background: '#fee2e2', color: '#b91c1c', border: 'none',
                            borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem',
                            cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
