'use client';
import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import BuildingSection from './BuildingSection';
import Modal from './Modal';
import Btn from './Btn';
import AIAssistant from './AIAssistant';
import { ThemeToggle } from './LoginScreen';

export default function Dashboard({ user, onSignOut }) {
  const [buildings, setBuildings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [buildingName, setBuildingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);

  const uid = user.uid;

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDark(true); document.documentElement.setAttribute('data-theme','dark'); }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    const q = query(collection(db, `users/${uid}/buildings`), orderBy('createdAt','asc'));
    const unsub = onSnapshot(q, snap => setBuildings(snap.docs.map(d => ({id:d.id,...d.data()}))));
    return () => unsub();
  }, [uid]);

  const handleAddBuilding = async () => {
    if (!buildingName.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db,`users/${uid}/buildings`), { name: buildingName.trim(), createdAt: Timestamp.now() });
      setBuildingName(''); setShowModal(false);
    } finally { setSaving(false); }
  };

  const handleDeleteBuilding = async (id) => {
    if (!confirm('Delete this building and all its data?')) return;
    await deleteDoc(doc(db,`users/${uid}/buildings/${id}`));
  };

  const monthLabel = new Date().toLocaleString('default',{month:'long',year:'numeric'});

  return (
    <div style={{ minHeight:'100vh', background:'var(--paper)', transition:'background 0.3s' }}>
      {/* Nav */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'var(--nav-bg)', borderBottom:'1px solid var(--border)', boxShadow:'var(--shadow-sm)', transition:'background 0.3s' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 20px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, background:'var(--ink)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>🏢</div>
            <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.15rem', color:'var(--ink)' }}>RentTrack</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
            <Btn variant="accent" size="sm" onClick={() => setShowModal(true)} icon="+">Building</Btn>
            <div style={{ position:'relative' }}>
              <button onClick={() => setMenuOpen(o=>!o)} style={{ width:38, height:38, borderRadius:'50%', background:'var(--accent-soft)', border:'none', cursor:'pointer', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {user.photoURL
                  ? <img src={user.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--accent)', fontSize:'1rem' }}>{(user.displayName||user.email||'U')[0].toUpperCase()}</span>
                }
              </button>
              {menuOpen && (
                <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'var(--paper-card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', boxShadow:'var(--shadow-md)', padding:'12px', minWidth:200, zIndex:200 }}>
                  <p style={{ fontSize:'0.82rem', color:'var(--ink-soft)', marginBottom:12, paddingBottom:12, borderBottom:'1px solid var(--border)' }}>{user.displayName||user.email}</p>
                  <button onClick={() => { setMenuOpen(false); onSignOut(); }} style={{ width:'100%', padding:'8px 10px', borderRadius:8, background:'#fee2e2', color:'#b91c1c', border:'none', fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:'0.85rem', cursor:'pointer', textAlign:'left' }}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {menuOpen && <div style={{ position:'fixed', inset:0, zIndex:99 }} onClick={() => setMenuOpen(false)} />}

      <main style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px 100px' }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(1.5rem,4vw,2rem)', fontWeight:800, color:'var(--ink)', marginBottom:4 }}>Dashboard</h1>
          <p style={{ color:'var(--ink-muted)', fontSize:'0.9rem' }}>Rent status for <strong style={{ color:'var(--ink-soft)' }}>{monthLabel}</strong></p>
        </div>

        {buildings.length === 0 ? (
          <div style={{ textAlign:'center', padding:'64px 24px', border:'2px dashed var(--border)', borderRadius:'var(--radius-lg)', background:'var(--paper-card)' }}>
            <div style={{ fontSize:'3rem', marginBottom:16 }}>🏢</div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:'1.3rem', fontWeight:700, color:'var(--ink)', marginBottom:10 }}>No buildings yet</h2>
            <p style={{ color:'var(--ink-muted)', marginBottom:24, maxWidth:320, margin:'0 auto 24px' }}>Add your first building or use the 🤖 AI button to create one by voice!</p>
            <Btn variant="accent" size="lg" onClick={() => setShowModal(true)} icon="🏢">Add Your First Building</Btn>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {buildings.map(b => <BuildingSection key={b.id} userId={uid} building={b} onDelete={() => handleDeleteBuilding(b.id)} />)}
          </div>
        )}
      </main>

      {showModal && (
        <Modal title="Add Building" onClose={() => setShowModal(false)}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--ink-soft)', display:'block', marginBottom:6 }}>Building Name *</label>
              <input type="text" value={buildingName} autoFocus onChange={e => setBuildingName(e.target.value)} onKeyDown={e => { if(e.key==='Enter') handleAddBuilding(); }} placeholder="e.g. Green Valley Apartments" />
            </div>
            <div style={{ display:'flex', gap:10, paddingTop:4 }}>
              <Btn variant="ghost" onClick={() => setShowModal(false)} fullWidth>Cancel</Btn>
              <Btn variant="primary" onClick={handleAddBuilding} disabled={saving||!buildingName.trim()} fullWidth>{saving?'Adding…':'Add Building'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      <AIAssistant userId={uid} buildings={buildings} />
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
