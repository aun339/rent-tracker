'use client';
import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import BuildingSection from './BuildingSection';
import Modal from './Modal';
import Btn from './Btn';
import AIAssistant from './AIAssistant';
import { ThemeToggle } from './LoginScreen';

interface Building { id: string; name: string; }
interface Analytics { totalExpected: number; totalCollected: number; totalPending: number; totalExpenses: number; occupancy: number; totalHouses: number; }

function getMonthRange() {
  const now = new Date();
  return { start: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)) };
}

function MetricCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color?: string; icon: string }) {
  return (
    <div style={{ background: 'var(--paper-elevated)', borderRadius: 'var(--radius)', padding: '18px 20px', border: '1.5px solid var(--border)', flex: 1, minWidth: 130, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--ink-muted)', fontFamily: 'Syne,sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: color || 'var(--ink)', fontFamily: 'Syne,sans-serif', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [buildingName, setBuildingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<'rent' | 'expenses'>('rent');
  const [analytics, setAnalytics] = useState<Analytics>({ totalExpected: 0, totalCollected: 0, totalPending: 0, totalExpenses: 0, occupancy: 0, totalHouses: 0 });
  const [expenseForm, setExpenseForm] = useState({ type: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const uid = user.uid;

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDark(true); document.documentElement.setAttribute('data-theme', 'dark'); }
  }, []);

  const toggleTheme = () => {
    const next = !dark; setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    const q = query(collection(db, `users/${uid}/buildings`), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => {
      const bs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Building));
      setBuildings(bs);
      if (bs.length > 0 && !selectedBuilding) setSelectedBuilding(bs[0].id);
    });
  }, [uid]);

  useEffect(() => {
    if (!selectedBuilding) return;
    const compute = async () => {
      const { start, end } = getMonthRange();
      const housesSnap = await getDocs(collection(db, `users/${uid}/buildings/${selectedBuilding}/houses`));
      const houses = housesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      let totalExpected = 0, totalCollected = 0, occupied = 0;
      for (const h of houses) {
        totalExpected += Number(h.monthlyRent) || 0;
        if (h.tenantName) occupied++;
        const pSnap = await getDocs(query(collection(db, `users/${uid}/buildings/${selectedBuilding}/houses/${h.id}/payments`), where('date', '>=', start), where('date', '<', end)));
        pSnap.docs.forEach(p => { totalCollected += Number((p.data() as any).amount) || 0; });
      }
      let totalExpenses = 0;
      try {
        const eSnap = await getDocs(query(collection(db, `users/${uid}/buildings/${selectedBuilding}/expenses`), where('date', '>=', start), where('date', '<', end)));
        eSnap.docs.forEach(e => { totalExpenses += Number((e.data() as any).amount) || 0; });
      } catch (_) {}
      setAnalytics({ totalExpected, totalCollected, totalPending: Math.max(0, totalExpected - totalCollected), totalExpenses, occupancy: houses.length ? Math.round((occupied / houses.length) * 100) : 0, totalHouses: houses.length });
    };
    compute();
  }, [selectedBuilding, buildings]);

  const handleAddBuilding = async () => {
    if (!buildingName.trim()) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, `users/${uid}/buildings`), { name: buildingName.trim(), createdAt: Timestamp.now() });
      setSelectedBuilding(ref.id); setBuildingName(''); setShowModal(false);
    } finally { setSaving(false); }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.type || !expenseForm.amount || !selectedBuilding) return;
    setSaving(true);
    try {
      await addDoc(collection(db, `users/${uid}/buildings/${selectedBuilding}/expenses`), { type: expenseForm.type, amount: Number(expenseForm.amount), date: Timestamp.fromDate(new Date(expenseForm.date + 'T00:00:00')), createdAt: Timestamp.now() });
      setExpenseForm({ type: '', amount: '', date: new Date().toISOString().split('T')[0] }); setShowExpenseModal(false);
    } finally { setSaving(false); }
  };

  const handleDeleteBuilding = async (id: string) => {
    if (!confirm('Delete this building and all its data?')) return;
    await deleteDoc(doc(db, `users/${uid}/buildings/${id}`));
    if (selectedBuilding === id) setSelectedBuilding(buildings.find(b => b.id !== id)?.id || null);
  };

  const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const netProfit = analytics.totalCollected - analytics.totalExpenses;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', transition: 'background 0.3s' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', transition: 'background 0.3s' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'var(--ink)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🏢</div>
            <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.15rem', color: 'var(--ink)' }}>RentTrack</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThemeToggle dark={dark} onToggle={toggleTheme} compact />
            <Btn variant="accent" size="sm" onClick={() => setShowModal(true)} icon="+">Building</Btn>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(o => !o)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-soft)', border: 'none', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {user.photoURL ? <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--accent)', fontSize: '1rem' }}>{(user.displayName || user.email || 'U')[0].toUpperCase()}</span>}
              </button>
              {menuOpen && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'var(--paper-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', padding: '12px', minWidth: 200, zIndex: 200 }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>{user.displayName || user.email}</p>
                  <button onClick={() => { setMenuOpen(false); onSignOut(); }} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--red-soft)', color: 'var(--red)', border: 'none', fontFamily: 'Syne,sans-serif', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}>Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      {menuOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setMenuOpen(false)} />}

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 100px' }}>
        {buildings.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <select value={selectedBuilding || ''} onChange={e => setSelectedBuilding(e.target.value)} style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '1.1rem', padding: '10px 40px 10px 16px', borderRadius: 12, background: 'var(--paper-card)', border: '1.5px solid var(--border)', color: 'var(--ink)', cursor: 'pointer', appearance: 'none', boxShadow: 'var(--shadow-sm)', minWidth: 180 }}>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--ink-muted)' }}>▾</span>
            </div>
            <div style={{ display: 'flex', background: 'var(--paper-warm)', borderRadius: 10, padding: 3, border: '1.5px solid var(--border)' }}>
              {(['rent', 'expenses'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{ padding: '7px 16px', borderRadius: 8, fontSize: '0.82rem', fontFamily: 'Syne,sans-serif', fontWeight: 600, background: view === v ? 'var(--paper-card)' : 'transparent', color: view === v ? 'var(--ink)' : 'var(--ink-muted)', boxShadow: view === v ? 'var(--shadow-sm)' : 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {v === 'rent' ? '💰 Rent' : '🔧 Expenses'}
                </button>
              ))}
            </div>
            {view === 'expenses' && <Btn variant="accent" size="sm" onClick={() => setShowExpenseModal(true)} icon="+">Add Expense</Btn>}
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginLeft: 'auto' }}>{monthLabel}</p>
          </div>
        )}

        {buildings.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            <MetricCard icon="🏠" label="Expected" value={`PKR ${analytics.totalExpected.toLocaleString()}`} sub={`${analytics.totalHouses} houses`} />
            <MetricCard icon="✅" label="Collected" value={`PKR ${analytics.totalCollected.toLocaleString()}`} color="var(--green)" />
            <MetricCard icon="⏳" label="Pending" value={`PKR ${analytics.totalPending.toLocaleString()}`} color={analytics.totalPending > 0 ? 'var(--amber)' : 'var(--green)'} />
            <MetricCard icon="🔧" label="Expenses" value={`PKR ${analytics.totalExpenses.toLocaleString()}`} color="var(--red)" />
            <MetricCard icon="📈" label="Net Profit" value={`PKR ${netProfit.toLocaleString()}`} color={netProfit >= 0 ? 'var(--green)' : 'var(--red)'} sub={`${analytics.occupancy}% occupied`} />
          </div>
        )}

        {buildings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--paper-card)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏢</div>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>No buildings yet</h2>
            <p style={{ color: 'var(--ink-muted)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>Add your first building or use the 🤖 AI button!</p>
            <Btn variant="accent" size="lg" onClick={() => setShowModal(true)} icon="🏢">Add Your First Building</Btn>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {buildings.filter(b => b.id === selectedBuilding).map(b => (
              <BuildingSection key={b.id} userId={uid} building={b} onDelete={() => handleDeleteBuilding(b.id)} viewMode={view} />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <Modal title="Add Building" onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Building Name *</label>
              <input type="text" value={buildingName} autoFocus onChange={e => setBuildingName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddBuilding(); }} placeholder="e.g. Green Valley, Gulberg, Model Town" />
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <Btn variant="ghost" onClick={() => setShowModal(false)} fullWidth>Cancel</Btn>
              <Btn variant="primary" onClick={handleAddBuilding} disabled={saving || !buildingName.trim()} fullWidth>{saving ? 'Adding…' : 'Add Building'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showExpenseModal && (
        <Modal title="Add Expense" onClose={() => setShowExpenseModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[{ label: 'Expense Type *', name: 'type', placeholder: 'e.g. Repair, Electricity' }, { label: 'Amount (PKR) *', name: 'amount', type: 'number', placeholder: '5000' }, { label: 'Date', name: 'date', type: 'date', placeholder: '' }].map(({ label, name, type = 'text', placeholder }) => (
              <div key={name}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>{label}</label>
                <input type={type} value={(expenseForm as any)[name]} placeholder={placeholder} onChange={e => setExpenseForm(f => ({ ...f, [name]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <Btn variant="ghost" onClick={() => setShowExpenseModal(false)} fullWidth>Cancel</Btn>
              <Btn variant="accent" onClick={handleAddExpense} disabled={saving || !expenseForm.type || !expenseForm.amount} fullWidth>{saving ? 'Saving…' : 'Add Expense'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      <AIAssistant userId={uid} buildings={buildings} />
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
