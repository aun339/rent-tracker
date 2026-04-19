'use client';
import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import { collection, query, where, Timestamp, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import Modal from './Modal';
import Btn from './Btn';
import PaymentHistory from './PaymentHistory';

interface House { id: string; houseNumber: string; tenantName: string; phoneNumber: string; monthlyRent: number; }
interface Payment { id: string; amount: number; date: any; }
interface EditForm { houseNumber: string; tenantName: string; phoneNumber: string; monthlyRent: string | number; }

function getMonthRange() {
  const now = new Date();
  return { start: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)) };
}

function EditHouseForm({ form, onChange }: { form: EditForm; onChange: (name: string, value: string) => void }) {
  const fields = [
    { label: 'House / Unit Number *', name: 'houseNumber', type: 'text', placeholder: 'e.g. A-101' },
    { label: 'Tenant Name', name: 'tenantName', type: 'text', placeholder: 'Full name' },
    { label: 'Phone / WhatsApp', name: 'phoneNumber', type: 'tel', placeholder: '+92 300 0000000' },
    { label: 'Monthly Rent (PKR)', name: 'monthlyRent', type: 'number', placeholder: 'e.g. 15000' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {fields.map(({ label, name, type, placeholder }) => (
        <div key={name}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>{label}</label>
          <input type={type} value={String((form as any)[name])} placeholder={placeholder} autoComplete="off" onChange={e => onChange(name, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function generateReceipt(house: House, amount: string, date: string, month: string): string {
  return `━━━━━━━━━━━━━━━━━━━━━━━━\n🧾 RENT RECEIPT\n━━━━━━━━━━━━━━━━━━━━━━━━\nUnit:     ${house.houseNumber}\nTenant:   ${house.tenantName || 'N/A'}\nMonth:    ${month}\nAmount:   PKR ${Number(amount).toLocaleString()}\nDate:     ${date}\nStatus:   ✅ PAID\n━━━━━━━━━━━━━━━━━━━━━━━━\nPowered by RentTrack`;
}

export default function HouseCard({ userId, buildingId, buildingName, house, onDelete }: { userId: string; buildingId: string; buildingName: string; house: House; onDelete: () => void }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPayment, setLastPayment] = useState<{ amount: string; date: string } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ houseNumber: house.houseNumber || '', tenantName: house.tenantName || '', phoneNumber: house.phoneNumber || '', monthlyRent: house.monthlyRent || '' });

  useEffect(() => {
    const { start, end } = getMonthRange();
    const q = query(collection(db, `users/${userId}/buildings/${buildingId}/houses/${house.id}/payments`), where('date', '>=', start), where('date', '<', end));
    return onSnapshot(q, snap => setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))));
  }, [userId, buildingId, house.id]);

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const pending = (house.monthlyRent || 0) - totalPaid;
  const fullyPaid = house.monthlyRent > 0 && pending <= 0;
  const noTenant = !house.tenantName;
  const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const handleAddPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, `users/${userId}/buildings/${buildingId}/houses/${house.id}/payments`), { amount: Number(payAmount), date: Timestamp.fromDate(new Date(payDate + 'T00:00:00')), createdAt: Timestamp.now() });
      setLastPayment({ amount: payAmount, date: payDate });
      setPayAmount(''); setShowPayModal(false); setShowReceiptModal(true);
    } finally { setSaving(false); }
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, `users/${userId}/buildings/${buildingId}/houses/${house.id}`), { houseNumber: editForm.houseNumber, tenantName: editForm.tenantName, phoneNumber: editForm.phoneNumber, monthlyRent: Number(editForm.monthlyRent) || 0 });
      setShowEditModal(false);
    } finally { setSaving(false); }
  };

  const openWhatsApp = () => {
    const phone = (house.phoneNumber || '').replace(/[^0-9]/g, '');
    if (!phone) { alert('No phone number saved for this tenant.'); return; }
    const msg = encodeURIComponent(`Hi ${house.tenantName}, your rent for ${monthLabel} is pending. Amount: PKR ${pending.toLocaleString()}. Please arrange payment. Thank you.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const shareReceipt = () => {
    if (!lastPayment) return;
    const phone = (house.phoneNumber || '').replace(/[^0-9]/g, '');
    const text = generateReceipt(house, lastPayment.amount, lastPayment.date, monthLabel);
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    else navigator.clipboard.writeText(text).then(() => alert('Receipt copied!'));
  };

  return (
    <>
      <div style={{ background: 'var(--paper-card)', borderRadius: 'var(--radius)', border: `1.5px solid ${fullyPaid ? '#86efac' : 'var(--border)'}`, boxShadow: 'var(--shadow-sm)', overflow: 'hidden', transition: 'box-shadow 0.18s' }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, background: fullyPaid ? 'rgba(34,197,94,0.05)' : 'var(--paper-elevated)' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h4 style={{ fontFamily: 'Syne,sans-serif', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)' }}>{house.houseNumber}</h4>
              {fullyPaid && <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, background: 'var(--green-soft)', color: 'var(--green)', fontWeight: 700 }}>✓ PAID</span>}
              {noTenant && <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, background: 'var(--amber-soft)', color: 'var(--amber)', fontWeight: 700 }}>Setup needed</span>}
            </div>
            <button onClick={() => setShowDetailsModal(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
              <p style={{ color: noTenant ? 'var(--ink-muted)' : 'var(--accent)', fontSize: '0.88rem', marginTop: 2, textDecoration: noTenant ? 'none' : 'underline', textDecorationStyle: 'dotted' }}>
                👤 {house.tenantName || 'No tenant — tap to set up'}
              </p>
            </button>
            {house.phoneNumber && <p style={{ color: 'var(--ink-muted)', fontSize: '0.78rem' }}>📞 {house.phoneNumber}</p>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {house.tenantName && house.monthlyRent > 0 && pending > 0 && (
              <button onClick={openWhatsApp} style={{ background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#15803d"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.133.558 4.135 1.535 5.874L.057 23.943l6.235-1.478A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.868 9.868 0 01-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374A9.867 9.867 0 012.106 12C2.106 6.58 6.58 2.106 12 2.106S21.894 6.58 21.894 12 17.42 21.894 12 21.894z" /></svg>
                Remind
              </button>
            )}
            <button onClick={() => { setEditForm({ houseNumber: house.houseNumber || '', tenantName: house.tenantName || '', phoneNumber: house.phoneNumber || '', monthlyRent: house.monthlyRent || '' }); setShowEditModal(true); }} style={{ background: 'var(--paper-warm)', color: 'var(--ink-soft)', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: '0.78rem', cursor: 'pointer' }}>✏️ Edit</button>
            <button onClick={onDelete} style={{ background: 'var(--paper-warm)', color: 'var(--ink-muted)', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: '0.78rem', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-soft)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--paper-warm)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-muted)'; }}
            >Remove</button>
          </div>
        </div>

        <div style={{ padding: '14px 16px' }}>
          {house.monthlyRent > 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[{ label: 'Monthly Rent', val: house.monthlyRent, color: 'var(--ink)' }, { label: 'Paid', val: totalPaid, color: 'var(--green)' }, { label: pending > 0 ? 'Pending' : 'Overpaid', val: Math.abs(pending), color: pending > 0 ? 'var(--amber)' : 'var(--green)' }].map(item => (
                  <div key={item.label} style={{ background: 'var(--paper-warm)', borderRadius: 'var(--radius-sm)', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: item.color, fontFamily: 'Syne,sans-serif' }}>{Number(item.val).toLocaleString()}</div>
                    <div style={{ fontSize: '0.67rem', color: 'var(--ink-muted)', marginTop: 2 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: 5, background: 'var(--paper-warm)', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ height: '100%', borderRadius: 99, background: fullyPaid ? 'var(--green)' : 'var(--accent)', width: `${Math.min(100, (totalPaid / house.monthlyRent) * 100)}%`, transition: 'width 0.4s' }} />
              </div>
            </>
          ) : (
            <div style={{ padding: '8px 0 14px', textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginBottom: 8 }}>Rent not set</p>
              <Btn variant="ghost" size="sm" onClick={() => setShowEditModal(true)}>✏️ Set up house</Btn>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variant="accent" size="sm" onClick={() => setShowPayModal(true)} icon="💳">Log Payment</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setShowHistory(true)} icon="📋">Past Records</Btn>
          </div>
        </div>
      </div>

      {showEditModal && (
        <Modal title={`Edit — ${house.houseNumber}`} onClose={() => setShowEditModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <EditHouseForm form={editForm} onChange={(n, v) => setEditForm(p => ({ ...p, [n]: v }))} />
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <Btn variant="ghost" onClick={() => setShowEditModal(false)} fullWidth>Cancel</Btn>
              <Btn variant="primary" onClick={handleEditSave} disabled={saving || !editForm.houseNumber} fullWidth>{saving ? 'Saving…' : 'Save Changes'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showDetailsModal && (
        <Modal title={`Tenant Details — ${house.houseNumber}`} onClose={() => setShowDetailsModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[{ label: 'Unit', val: house.houseNumber }, { label: 'Tenant Name', val: house.tenantName || '—' }, { label: 'Phone', val: house.phoneNumber || '—' }, { label: 'Monthly Rent', val: house.monthlyRent ? `PKR ${Number(house.monthlyRent).toLocaleString()}` : 'Not set' }, { label: 'Paid This Month', val: `PKR ${totalPaid.toLocaleString()}` }, { label: 'Pending', val: pending > 0 ? `PKR ${pending.toLocaleString()}` : 'Fully paid ✅' }].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--paper-warm)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: '0.88rem', color: 'var(--ink)', fontWeight: 600 }}>{val}</span>
              </div>
            ))}
            <div style={{ padding: '12px', background: 'var(--amber-soft)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--amber)' }}>📄 Lease contract upload — coming soon.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {house.phoneNumber && pending > 0 && <Btn variant="ghost" onClick={openWhatsApp} fullWidth>📱 WhatsApp</Btn>}
              <Btn variant="primary" onClick={() => { setShowDetailsModal(false); setShowEditModal(true); }} fullWidth>✏️ Edit</Btn>
            </div>
          </div>
        </Modal>
      )}

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
              <Btn variant="green" onClick={handleAddPayment} disabled={saving || !payAmount} fullWidth>{saving ? 'Saving…' : 'Save Payment'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showReceiptModal && lastPayment && (
        <Modal title="Payment Saved ✅" onClose={() => setShowReceiptModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--paper-warm)', borderRadius: 'var(--radius)', padding: '20px', fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.8, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
              {generateReceipt(house, lastPayment.amount, lastPayment.date, monthLabel)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="ghost" onClick={() => navigator.clipboard.writeText(generateReceipt(house, lastPayment!.amount, lastPayment!.date, monthLabel)).then(() => alert('Copied!'))} fullWidth icon="📋">Copy</Btn>
              <Btn variant="green" onClick={shareReceipt} fullWidth icon="📱">{house.phoneNumber ? 'Send WhatsApp' : 'Copy Receipt'}</Btn>
            </div>
            <Btn variant="ghost" onClick={() => setShowReceiptModal(false)} fullWidth>Close</Btn>
          </div>
        </Modal>
      )}

      {showHistory && <PaymentHistory userId={userId} buildingId={buildingId} houseId={house.id} houseName={house.houseNumber} monthlyRent={house.monthlyRent} onClose={() => setShowHistory(false)} />}
    </>
  );
}
