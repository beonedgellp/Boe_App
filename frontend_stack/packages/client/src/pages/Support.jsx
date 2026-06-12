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

        <div className="be-card apk-faq-card">
          {filtered.length === 0 ? (
            <div className="apk-faq-empty">No matching articles. Open a ticket below.</div>
          ) : filtered.map((f, i) => (
            <div key={i} className="apk-faq-item">
              <div className="apk-faq-q" onClick={() => setOpenIdx(openIdx === i ? -1 : i)}>
                <span>{f.q || f.question}</span><ChevronDown size={16} strokeWidth={1.5} className={`apk-faq-chevron ${openIdx === i ? 'is-open' : ''}`} />
              </div>
              {openIdx === i && <div className="apk-faq-a">{f.a || f.answer}</div>}
            </div>
          ))}
        </div>

        <div className="be-card apk-help-card">
          <div className="apk-help-title">Still need help?</div>
          <div className="apk-help-subtitle">We respond within 1 business day.</div>
          <div className="apk-help-actions">
            <button className="be-btn be-btn-primary" onClick={() => setShowForm(true)}>Open a ticket</button>
            <a className="be-btn be-btn-secondary" href="mailto:support@beonedge.example">Email us</a>
          </div>
        </div>

        {showForm && (
          <div className="be-card apk-ticket-form">
            <div className="be-field"><label>Subject</label><input className="be-input" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div className="be-field"><label>Category</label>
              <select className="be-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="general">General</option><option value="technical">Technical</option><option value="billing">Billing</option><option value="kyc">KYC</option><option value="sip">SIP</option><option value="withdrawal">Withdrawal</option><option value="mandate">Mandate</option>
              </select>
            </div>
            <div className="be-field"><label>Describe the issue</label><textarea className="be-input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></div>
            <div className="apk-ticket-actions">
              <button className="be-btn be-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="be-btn be-btn-primary" onClick={submit} disabled={submitting || !subject || !body}>{submitting ? 'Sending…' : 'Submit'}</button>
            </div>
          </div>
        )}

        <div className="be-eyebrow">My tickets</div>
        <div className="be-card be-card--flush">
          {tickets.length === 0 ? (
            <div className="apk-tickets-empty">No tickets yet.</div>
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
