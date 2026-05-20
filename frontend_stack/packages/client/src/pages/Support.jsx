import React, { useEffect, useState } from 'react';
import AppBar from '../layout/AppBar.jsx';
import { Search, ChevronDown } from 'lucide-react';
import * as supportApi from '../services/supportApi.js';
import { fmtDate } from '../utils/format.js';

export default function Support() {
  const [faqs, setFaqs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [openIdx, setOpenIdx] = useState(-1);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { supportApi.listFaqs().then(setFaqs).catch(() => setFaqs([])); supportApi.listTickets().then(setTickets).catch(() => setTickets([])); }, []);

  const filtered = faqs.filter((f) => {
    const question = (f.q || f.question || '').toLowerCase();
    const answer = (f.a || f.answer || '').toLowerCase();
    const search = q.toLowerCase();
    return question.includes(search) || answer.includes(search);
  });

  async function submit() {
    if (!subject || !body) return;
    setSubmitting(true);
    const t = await supportApi.createTicket({ subject, body, category });
    setTickets((s) => [t, ...s]);
    setShowForm(false); setSubject(''); setBody(''); setSubmitting(false);
  }

  return (
    <>
      <AppBar title="Support" />
      <div className="apk-screen">
        <div className="apk-search">
          <Search size={18} strokeWidth={1.5} />
          <input className="be-input" placeholder="Search help articles" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="be-card" style={{ padding: '4px 16px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--be-slate)', fontSize: 13 }}>No matching articles. Open a ticket below.</div>
          ) : filtered.map((f, i) => (
            <div key={i} className="apk-faq-item">
              <div className="apk-faq-q" onClick={() => setOpenIdx(openIdx === i ? -1 : i)}>
                <span>{f.q || f.question}</span><ChevronDown size={16} strokeWidth={1.5} style={{ transform: openIdx === i ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }} />
              </div>
              {openIdx === i && <div className="apk-faq-a">{f.a || f.answer}</div>}
            </div>
          ))}
        </div>

        <div className="be-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Still need help?</div>
          <div style={{ fontSize: 13, color: 'var(--be-slate)', marginTop: 4 }}>We respond within 1 business day.</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="be-btn be-btn-primary" style={{ flex: 1 }} onClick={() => setShowForm(true)}>Open a ticket</button>
            <a className="be-btn be-btn-secondary" style={{ flex: 1 }} href="mailto:support@beonedge.example">Email us</a>
          </div>
        </div>

        {showForm && (
          <div className="be-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="be-field"><label>Subject</label><input className="be-input" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div className="be-field"><label>Category</label>
              <select className="be-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="general">General</option><option value="technical">Technical</option><option value="billing">Billing</option><option value="kyc">KYC</option><option value="sip">SIP</option><option value="withdrawal">Withdrawal</option><option value="mandate">Mandate</option>
              </select>
            </div>
            <div className="be-field"><label>Describe the issue</label><textarea className="be-input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="be-btn be-btn-secondary" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancel</button>
              <button className="be-btn be-btn-primary" style={{ flex: 1 }} onClick={submit} disabled={submitting || !subject || !body}>{submitting ? 'Sending…' : 'Submit'}</button>
            </div>
          </div>
        )}

        <div className="be-eyebrow">My tickets</div>
        <div className="be-card" style={{ padding: 0 }}>
          {tickets.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--be-slate)', fontSize: 13 }}>No tickets yet.</div>
          ) : tickets.map((t) => (
            <div key={t.id} className="apk-list-row">
              <div><div className="apk-list-l">{t.subject}</div><div className="apk-list-meta">Updated {fmtDate(t.updatedAt)}</div></div>
              <span className={'be-badge ' + (t.status === 'open' ? 'be-badge-paused' : 'be-badge-active')}><span className="be-badge-dot" />{t.status}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
