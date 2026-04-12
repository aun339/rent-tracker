'use client';
import { useState, useRef, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';

function speak(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export default function AIAssistant({ userId, buildings }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '👋 Assalam o Alaikum! Main aapka RentTrack assistant hoon.\n\nAap mujhse English, Urdu ya Hindi mein baat kar sakte hain.\n\nMisaal ke tor par:\n• "Add building Green Valley"\n• "Ghar A1 add karo, tenant Ali, kiraya 15000"\n• "Log payment 5000 for house A1 in Green Valley"',
    },
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Voice input is not supported in this browser. Please use Chrome.');
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'ur-PK';
    recognitionRef.current = recognition;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => sendMessage(transcript), 300);
    };
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput('');

    const userMsg = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const buildingsSummary = buildings.map(b => `• Building: "${b.name}" (id: ${b.id})`).join('\n') || 'No buildings yet.';

    let housesSummary = '';
    for (const b of buildings) {
      try {
        const snap = await getDocs(query(collection(db, `users/${userId}/buildings/${b.id}/houses`), orderBy('createdAt')));
        snap.docs.forEach(d => {
          const h = d.data();
          housesSummary += `• Building "${b.name}" → House "${h.houseNumber}", Tenant: ${h.tenantName}, Rent: ${h.monthlyRent}, houseId: ${d.id}, buildingId: ${b.id}\n`;
        });
      } catch (_) {}
    }

    const systemPrompt = `You are a helpful rent management assistant for a Pakistani landlord app called RentTrack.
The user may speak in English, Urdu, or Hindi (or a mix). Always reply in the SAME language the user used.
Be brief and friendly.

CURRENT DATA:
Buildings:
${buildingsSummary}

Houses:
${housesSummary || 'No houses yet.'}

Today: ${new Date().toLocaleDateString('en-PK')}

YOUR JOB:
Understand what the user wants and respond with a JSON action + a friendly message.

POSSIBLE ACTIONS:
1. add_building  → { "action":"add_building", "buildingName":"..." }
2. add_house     → { "action":"add_house", "buildingId":"...", "houseNumber":"...", "tenantName":"...", "phoneNumber":"...", "monthlyRent":15000 }
3. log_payment   → { "action":"log_payment", "buildingId":"...", "houseId":"...", "amount":5000, "date":"YYYY-MM-DD" }
4. info          → { "action":"info" }

CRITICAL RULES:
- ALWAYS return valid JSON on the VERY FIRST LINE, then a blank line, then your friendly reply text.
- The JSON must be on line 1 with NO text before it.
- If something is missing ask the user for it.
- For log_payment, match house by houseNumber and building by name from CURRENT DATA.
- Phone number is optional, use "" if not given.
- Date defaults to today if not mentioned.
- ONLY use IDs from CURRENT DATA above, never make up IDs.

Example of correct output format:
{"action":"add_building","buildingName":"Green Valley"}
Building "Green Valley" add ho gayi! 🎉

Another example:
{"action":"info"}
Aapke paas 2 buildings hain.`;

    try {
      // Build message history for Gemini (must alternate user/model)
      const historyMessages = messages
        .slice(1) // skip initial greeting
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      // Add current user message
      historyMessages.push({ role: 'user', content: text });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: historyMessages,
        }),
      });

      const data = await response.json();
      const raw = data.content?.map(c => c.text || '').join('') || '';

      console.log('AI raw response:', raw); // for debugging

      // Parse first line as JSON action
      const lines = raw.trim().split('\n');
      let actionObj = null;
      let replyText = raw;

      // Find the first line that looks like JSON
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i].trim();
        if (line.startsWith('{') && line.endsWith('}')) {
          try {
            actionObj = JSON.parse(line);
            replyText = lines.slice(i + 1).join('\n').trim();
            break;
          } catch (_) {}
        }
      }

      // Execute the action
      if (actionObj && actionObj.action !== 'info') {
        try {
          await executeAction(actionObj);
          if (!replyText) replyText = '✅ Done!';
        } catch (err) {
          replyText = '⚠️ Error: ' + err.message;
        }
      }

      if (!replyText) replyText = raw;

      setMessages(prev => [...prev, { role: 'assistant', text: replyText }]);
      speak(replyText);
    } catch (err) {
      console.error('AI error:', err);
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (obj) => {
    switch (obj.action) {
      case 'add_building': {
        if (!obj.buildingName) throw new Error('Building name missing');
        await addDoc(collection(db, `users/${userId}/buildings`), {
          name: obj.buildingName.trim(),
          createdAt: Timestamp.now(),
        });
        break;
      }
      case 'add_house': {
        if (!obj.buildingId) throw new Error('Building not found — please mention the building name');
        await addDoc(collection(db, `users/${userId}/buildings/${obj.buildingId}/houses`), {
          houseNumber: obj.houseNumber || 'Unknown',
          tenantName: obj.tenantName || 'Unknown',
          phoneNumber: obj.phoneNumber || '',
          monthlyRent: Number(obj.monthlyRent) || 0,
          createdAt: Timestamp.now(),
        });
        break;
      }
      case 'log_payment': {
        if (!obj.buildingId || !obj.houseId) throw new Error('House not found — please mention building and house number');
        const dateStr = obj.date || new Date().toISOString().split('T')[0];
        await addDoc(
          collection(db, `users/${userId}/buildings/${obj.buildingId}/houses/${obj.houseId}/payments`),
          {
            amount: Number(obj.amount) || 0,
            date: Timestamp.fromDate(new Date(dateStr + 'T00:00:00')),
            createdAt: Timestamp.now(),
          }
        );
        break;
      }
      default:
        break;
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title="AI Assistant"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 500,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? 'var(--ink)' : 'var(--accent)',
          color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
          animation: open ? 'none' : 'pulse 2.5s infinite',
        }}
      >
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 24, zIndex: 499,
          width: 'min(380px, calc(100vw - 48px))',
          height: 'min(520px, calc(100vh - 120px))',
          background: 'var(--paper-card)', borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'slideUp 0.2s ease',
        }}>
          <div style={{
            padding: '14px 16px', background: 'var(--ink)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0,
            }}>🤖</div>
            <div>
              <p style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem' }}>
                RentTrack AI
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>
                English • اردو • हिंदी
              </p>
            </div>
            <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%', padding: '10px 13px', borderRadius: 12,
                  borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                  borderBottomLeftRadius: m.role === 'assistant' ? 4 : 12,
                  background: m.role === 'user' ? 'var(--accent)' : 'var(--paper-warm)',
                  color: m.role === 'user' ? '#fff' : 'var(--ink)',
                  fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 12, borderBottomLeftRadius: 4,
                  background: 'var(--paper-warm)', display: 'flex', gap: 5, alignItems: 'center'
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%', background: 'var(--ink-muted)',
                      animation: `bounce 1s ease ${i * 0.15}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{
            padding: '12px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: 8, alignItems: 'flex-end',
          }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder='Type or speak in English / اردو / हिंदी...'
              rows={1}
              style={{
                flex: 1, resize: 'none', border: '1.5px solid var(--border)',
                borderRadius: 10, padding: '9px 12px', fontSize: '0.88rem',
                fontFamily: 'DM Sans, sans-serif', background: 'var(--paper)',
                color: 'var(--ink)', outline: 'none', maxHeight: 80,
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={listening ? stopListening : startListening}
              title={listening ? 'Stop' : 'Speak'}
              style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: listening ? '#fee2e2' : 'var(--paper-warm)',
                color: listening ? '#b91c1c' : 'var(--ink-soft)',
                border: listening ? '2px solid #fca5a5' : '1.5px solid var(--border)',
                cursor: 'pointer', fontSize: '1rem', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                animation: listening ? 'pulse 1s infinite' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {listening ? '⏹' : '🎤'}
            </button>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: (!input.trim() || loading) ? 'var(--paper-warm)' : 'var(--accent)',
                color: (!input.trim() || loading) ? 'var(--ink-muted)' : '#fff',
                border: 'none', cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:0.85} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  );
}
