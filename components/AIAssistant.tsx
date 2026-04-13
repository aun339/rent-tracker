'use client';
import { useState, useRef, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';

function speak(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export default function AIAssistant({ userId, buildings }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: '👋 Assalam o Alaikum!\n\nMain aapka RentTrack AI assistant hoon.\n\n✍️ Type karo ya bolo:\n• "Add building ST6 with 5 houses"\n• "ST6 mein 7 ghar banao"\n\n📷 Image upload karo:\n• Rent receipt ki photo → payment log ho jaegi\n\n📄 PDF upload karo:\n• Rent document → info extract ho jaegi',
  }]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState(null); // {type:'image'|'pdf', name, base64, mimeType, pdfText}
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, open]);

  // ── Voice ────────────────────────────────────────────────────────────────
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Please use Chrome for voice input.'); return; }
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = 'ur-PK';
    recognitionRef.current = r;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setInput(t);
      setTimeout(() => sendMessage(t), 300);
    };
    r.start();
  };
  const stopListening = () => { recognitionRef.current?.stop(); setListening(false); };

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    if (!isImage && !isPDF) { alert('Please upload an image or PDF file.'); return; }

    const toBase64 = (f) => new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(',')[1]);
      reader.onerror = rej;
      reader.readAsDataURL(f);
    });

    if (isImage) {
      const base64 = await toBase64(file);
      setAttachment({ type:'image', name:file.name, base64, mimeType:file.type });
    } else if (isPDF) {
      // Extract text from PDF using basic reader
      const base64 = await toBase64(file);
      setAttachment({ type:'pdf', name:file.name, base64, mimeType:file.type, pdfText:'[PDF uploaded — AI will analyze it]' });
    }
    e.target.value = '';
  };

  // ── Send ─────────────────────────────────────────────────────────────────
  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text && !attachment) return;
    if (loading) return;
    setInput('');

    const userMsgText = attachment
      ? `${text || 'Please analyze this file.'} [${attachment.type === 'image' ? '📷' : '📄'} ${attachment.name}]`
      : text;

    const currentAttachment = attachment;
    setAttachment(null);
    setMessages(prev => [...prev, { role:'user', text: userMsgText }]);
    setLoading(true);

    // Build data snapshot
    const buildingsSummary = buildings.map(b=>`• "${b.name}" (buildingId: ${b.id})`).join('\n') || 'None';
    let housesSummary = '';
    for (const b of buildings) {
      try {
        const snap = await getDocs(query(collection(db,`users/${userId}/buildings/${b.id}/houses`), orderBy('createdAt')));
        snap.docs.forEach(d => {
          const h = d.data();
          housesSummary += `• Building "${b.name}" → House "${h.houseNumber}", Tenant: ${h.tenantName||'N/A'}, Rent: ${h.monthlyRent||0}, houseId: ${d.id}, buildingId: ${b.id}\n`;
        });
      } catch(_) {}
    }

    const systemPrompt = `You are a smart rent management assistant for RentTrack (Pakistani landlord app).
Understand English, Urdu, Hindi or mixed language. Reply in the EXACT same language the user used.
If user writes in Urdu → reply in Urdu. If English → reply in English. If mixed → reply in mixed.

CURRENT DATA:
Buildings: ${buildingsSummary}
Houses:\n${housesSummary||'None yet'}
Today: ${new Date().toLocaleDateString('en-PK')}

ACTIONS:
1. {"action":"add_building","buildingName":"..."}
2. {"action":"add_building_with_houses","buildingName":"...","houses":["1","2","3"]}
   - "5 houses" → ["1","2","3","4","5"]
   - "houses A,B,C" → ["A","B","C"]
3. {"action":"add_houses","buildingId":"...","houses":["4","5"]}
4. {"action":"log_payment","buildingId":"...","houseId":"...","amount":5000,"date":"YYYY-MM-DD"}
5. {"action":"info"}

IMAGE/PDF RULES:
- If an image is uploaded, look for: building name, house number, tenant name, rent amount, payment date
- Extract payment info → use log_payment action
- If building/house not in CURRENT DATA, use add_building_with_houses first
- For PDF, extract all relevant rent info similarly

CRITICAL FORMAT RULES:
- Line 1: JSON only (no text before it)
- Line 2+: friendly reply in user's language
- Never invent IDs — only use IDs from CURRENT DATA`;

    try {
      const historyMessages = messages.slice(1).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
      historyMessages.push({ role:'user', content: userMsgText });

      const payload = { system: systemPrompt, messages: historyMessages };
      if (currentAttachment?.type === 'image') {
        payload.imageBase64 = currentAttachment.base64;
        payload.imageType = currentAttachment.mimeType;
      }
      if (currentAttachment?.type === 'pdf') {
        payload.pdfText = `PDF file "${currentAttachment.name}" was uploaded. Please extract any rent-related information from it.`;
        payload.imageBase64 = currentAttachment.base64;
        payload.imageType = 'application/pdf';
      }

      const response = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const raw = data.content?.map(c=>c.text||'').join('') || '';
      console.log('AI raw:', raw);

      const lines = raw.trim().split('\n');
      let actionObj = null;
      let replyText = raw;

      for (let i = 0; i < Math.min(4, lines.length); i++) {
        const line = lines[i].trim();
        if (line.startsWith('{') && line.includes('"action"')) {
          try { actionObj = JSON.parse(line); replyText = lines.slice(i+1).join('\n').trim(); break; }
          catch(_) {}
        }
      }

      if (actionObj && actionObj.action !== 'info') {
        try { await executeAction(actionObj); }
        catch(err) { replyText = '⚠️ Error: ' + err.message; }
      }

      setMessages(prev => [...prev, { role:'assistant', text: replyText || '✅ Done!' }]);
      speak(replyText);
    } catch(err) {
      setMessages(prev => [...prev, { role:'assistant', text:'⚠️ Connection error. Please try again.' }]);
    } finally { setLoading(false); }
  };

  const executeAction = async (obj) => {
    switch(obj.action) {
      case 'add_building':
        if (!obj.buildingName) throw new Error('Building name missing');
        await addDoc(collection(db,`users/${userId}/buildings`), { name:obj.buildingName.trim(), createdAt:Timestamp.now() });
        break;
      case 'add_building_with_houses': {
        if (!obj.buildingName) throw new Error('Building name missing');
        if (!obj.houses?.length) throw new Error('No houses specified');
        const ref = await addDoc(collection(db,`users/${userId}/buildings`), { name:obj.buildingName.trim(), createdAt:Timestamp.now() });
        for (const h of obj.houses) {
          await addDoc(collection(db,`users/${userId}/buildings/${ref.id}/houses`), { houseNumber:String(h), tenantName:'', phoneNumber:'', monthlyRent:0, createdAt:Timestamp.now() });
        }
        break;
      }
      case 'add_houses':
        if (!obj.buildingId) throw new Error('Building not found');
        for (const h of obj.houses||[]) {
          await addDoc(collection(db,`users/${userId}/buildings/${obj.buildingId}/houses`), { houseNumber:String(h), tenantName:'', phoneNumber:'', monthlyRent:0, createdAt:Timestamp.now() });
        }
        break;
      case 'log_payment':
        if (!obj.buildingId||!obj.houseId) throw new Error('House not found — please mention building and house number');
        await addDoc(collection(db,`users/${userId}/buildings/${obj.buildingId}/houses/${obj.houseId}/payments`), {
          amount:Number(obj.amount)||0,
          date:Timestamp.fromDate(new Date((obj.date||new Date().toISOString().split('T')[0])+'T00:00:00')),
          createdAt:Timestamp.now()
        });
        break;
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* FAB */}
      <button onClick={() => setOpen(o=>!o)} style={{
        position:'fixed', bottom:24, right:24, zIndex:500,
        width:58, height:58, borderRadius:'50%',
        background: open ? 'var(--ink)' : 'var(--accent)',
        color:'#fff', border:'none', cursor:'pointer',
        boxShadow:'0 4px 20px rgba(0,0,0,0.25)',
        fontSize:'1.5rem', display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all 0.2s ease',
        animation: open ? 'none' : 'pulse 2.5s infinite',
      }}>
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div style={{
          position:'fixed', bottom:94, right:24, zIndex:499,
          width:'min(390px, calc(100vw - 48px))',
          height:'min(540px, calc(100vh - 120px))',
          background:'var(--paper-card)', borderRadius:'var(--radius-lg)',
          border:'1.5px solid var(--border)', boxShadow:'var(--shadow-lg)',
          display:'flex', flexDirection:'column', overflow:'hidden',
          animation:'slideUp 0.2s ease',
        }}>
          {/* Header */}
          <div style={{ padding:'14px 16px', background:'var(--ink)', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>🤖</div>
            <div>
              <p style={{ color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.95rem' }}>RentTrack AI</p>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.7rem' }}>English • اردو • हिंदी • 📷 Images • 📄 PDFs</p>
            </div>
            <div style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%', background:'#4ade80' }} />
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
            {messages.map((m,i) => (
              <div key={i} style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth:'84%', padding:'10px 13px', borderRadius:12,
                  borderBottomRightRadius: m.role==='user' ? 4 : 12,
                  borderBottomLeftRadius: m.role==='assistant' ? 4 : 12,
                  background: m.role==='user' ? 'var(--accent)' : 'var(--paper-warm)',
                  color: m.role==='user' ? '#fff' : 'var(--ink)',
                  fontSize:'0.88rem', lineHeight:1.5, whiteSpace:'pre-wrap',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:'flex', justifyContent:'flex-start' }}>
                <div style={{ padding:'10px 14px', borderRadius:12, borderBottomLeftRadius:4, background:'var(--paper-warm)', display:'flex', gap:5, alignItems:'center' }}>
                  {[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:'50%',background:'var(--ink-muted)',animation:`bounce 1s ease ${i*0.15}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Attachment preview */}
          {attachment && (
            <div style={{ padding:'8px 12px', background:'var(--paper-warm)', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:'1.2rem' }}>{attachment.type==='image' ? '📷' : '📄'}</span>
              <span style={{ fontSize:'0.8rem', color:'var(--ink-soft)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{attachment.name}</span>
              <button onClick={() => setAttachment(null)} style={{ background:'none', border:'none', color:'var(--ink-muted)', cursor:'pointer', fontSize:'1rem', padding:'0 4px' }}>✕</button>
            </div>
          )}

          {/* Input bar */}
          <div style={{ padding:'12px', borderTop:'1px solid var(--border)', display:'flex', gap:8, alignItems:'flex-end' }}>
            {/* Attach file */}
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} style={{ display:'none' }} />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload image or PDF"
              style={{ width:38, height:38, borderRadius:'50%', flexShrink:0, background:'var(--paper-warm)', color:'var(--ink-soft)', border:'1.5px solid var(--border)', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--border)'}
              onMouseLeave={e=>e.currentTarget.style.background='var(--paper-warm)'}
            >📎</button>

            <textarea
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();} }}
              placeholder="Type or speak in English / اردو / हिंदी..."
              rows={1}
              style={{ flex:1, resize:'none', border:'1.5px solid var(--border)', borderRadius:10, padding:'9px 12px', fontSize:'0.88rem', fontFamily:'DM Sans,sans-serif', background:'var(--paper)', color:'var(--ink)', outline:'none', maxHeight:80 }}
              onFocus={e=>e.target.style.borderColor='var(--accent)'}
              onBlur={e=>e.target.style.borderColor='var(--border)'}
            />

            {/* Mic */}
            <button onClick={listening ? stopListening : startListening} style={{
              width:38,height:38,borderRadius:'50%',flexShrink:0,
              background:listening?'#fee2e2':'var(--paper-warm)',
              color:listening?'#b91c1c':'var(--ink-soft)',
              border:listening?'2px solid #fca5a5':'1.5px solid var(--border)',
              cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center',
              animation:listening?'pulse 1s infinite':'none',transition:'all 0.15s',
            }}>{listening?'⏹':'🎤'}</button>

            {/* Send */}
            <button onClick={()=>sendMessage()} disabled={(!input.trim()&&!attachment)||loading} style={{
              width:38,height:38,borderRadius:'50%',flexShrink:0,
              background:((!input.trim()&&!attachment)||loading)?'var(--paper-warm)':'var(--accent)',
              color:((!input.trim()&&!attachment)||loading)?'var(--ink-muted)':'#fff',
              border:'none',cursor:((!input.trim()&&!attachment)||loading)?'not-allowed':'pointer',
              fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s',
            }}>➤</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:0.85}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </>
  );
}
