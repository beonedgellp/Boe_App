import React, { useEffect, useState } from 'react';
import { Download, Eye, FileText, FolderOpen } from 'lucide-react';
import * as statementsApi from '../services/statementsApi.js';
import { fmtDate } from '../utils/format.js';

const TABS = [['monthly','Monthly'],['quarterly','Quarterly'],['fy','Yearly'],['capital_gains','Capital gains']];
const PERIOD_LABEL = { monthly: 'Monthly', quarterly: 'Quarterly', fy: 'FY', capital_gains: 'Capital gains' };
const PERIOD_EMPTY = {
  monthly: 'No monthly statements yet. Your first monthly statement is generated after one full settlement cycle.',
  quarterly: 'No quarterly statements yet. Quarterly statements are issued after each fiscal quarter closes.',
  fy: 'No yearly statements yet. Annual statements are published after the financial year ends.',
  capital_gains: 'No capital gains statement available. It is generated once a redemption settles in this financial year.',
};

function formatStatementSize(statement) {
  if (statement.sizeLabel) return statement.sizeLabel;
  if (statement.fileSizeLabel) return statement.fileSizeLabel;
  if (typeof statement.fileSize === 'string') return statement.fileSize;
  const bytes = Number(statement.sizeBytes ?? statement.fileSize);
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Size pending';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statementPreview(statement) {
  return statement.previewText || statement.summaryText || statement.content || 'Preview pending backend document.';
}

export default function Statements() {
  const [tab, setTab] = useState('monthly');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => { statementsApi.listStatements().then(setItems).catch(() => setItems([])); }, []);
  const filtered = items.filter((s) => s.period === tab);

  const totalCount = items.length;
  const filteredCount = filtered.length;
  const currentPeriodLabel = PERIOD_LABEL[tab];

  return (
    <div className="apk-screen apk-statements-screen">
      <header className="apk-statements-head">
        <div className="apk-statements-head-copy">
          <span className="be-eyebrow">Documents</span>
          <h1 className="apk-h">Statements</h1>
          <p className="apk-statements-sub">
            Download or preview your account statements. {totalCount > 0 ? `${totalCount} on file.` : 'Statements appear here as cycles close.'}
          </p>
        </div>
        <div className="apk-statements-summary" aria-label="Statement summary">
          <div>
            <span className="be-num">{totalCount}</span>
            <span>On file</span>
          </div>
          <div>
            <span className="be-num">{filteredCount}</span>
            <span>{currentPeriodLabel}</span>
          </div>
        </div>
      </header>

      <div className="apk-tabs apk-statements-tabs" role="tablist" aria-label="Statement period">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? 'is-active' : ''}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="be-card apk-empty apk-statements-empty">
          <span className="apk-statements-empty-icon" aria-hidden="true">
            <FolderOpen size={22} strokeWidth={1.5} />
          </span>
          <h2 className="apk-h-sm">Nothing here yet</h2>
          <p>{PERIOD_EMPTY[tab]}</p>
        </div>
      ) : (
        <ul className="be-card apk-statements-list" role="list" aria-label={`${currentPeriodLabel} statements`}>
          {filtered.map((s) => (
            <li key={s.id} className="apk-statements-row">
              <button
                type="button"
                className="apk-statements-main"
                onClick={() => setOpen(s)}
                aria-label={`Preview ${PERIOD_LABEL[s.period]} statement, ${fmtDate(s.from)} to ${fmtDate(s.to)}`}
              >
                <span className="apk-statements-icon" aria-hidden="true">
                  <FileText size={18} strokeWidth={1.5} />
                </span>
                <span className="apk-statements-text">
                  <span className="apk-statements-period">
                    {PERIOD_LABEL[s.period]}
                    <span className="apk-statements-sep" aria-hidden="true">·</span>
                    <span className="be-tnum">{fmtDate(s.from)} — {fmtDate(s.to)}</span>
                  </span>
                  <span className="apk-statements-meta">
                    Generated {fmtDate(s.generatedAt)}
                    <span className="apk-statements-dot" aria-hidden="true">•</span>
                    PDF
                    <span className="apk-statements-dot" aria-hidden="true">•</span>
                    {formatStatementSize(s)}
                  </span>
                </span>
              </button>
              <div className="apk-statements-actions">
                <button
                  type="button"
                  className="apk-statements-action"
                  onClick={() => setOpen(s)}
                  aria-label={`Preview ${PERIOD_LABEL[s.period]} statement, ${fmtDate(s.from)} to ${fmtDate(s.to)}`}
                >
                  <Eye size={16} strokeWidth={1.5} />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  className="apk-statements-action is-primary"
                  aria-label={`Download ${PERIOD_LABEL[s.period]} statement, ${fmtDate(s.from)} to ${fmtDate(s.to)}`}
                >
                  <Download size={16} strokeWidth={1.5} />
                  <span>Download</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="be-disclosure apk-statements-disclosure">
        Statements reflect BeOnEdge-published NAV and reconciled ledger entries.
      </p>

      {open && (
        <div className="apk-sheet-overlay" onClick={() => setOpen(null)}>
          <div
            className="apk-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apk-statements-sheet-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="apk-sheet-handle" />
            <div className="apk-statements-sheet-head">
              <span className="be-eyebrow">{PERIOD_LABEL[open.period]} statement</span>
              <h2 id="apk-statements-sheet-title" className="apk-h-sm">
                {fmtDate(open.from)} — {fmtDate(open.to)}
              </h2>
              <p className="apk-statements-sheet-meta">
                Generated {fmtDate(open.generatedAt)}
                <span className="apk-statements-dot" aria-hidden="true">•</span>
                PDF
                <span className="apk-statements-dot" aria-hidden="true">•</span>
                {formatStatementSize(open)}
              </p>
            </div>
            <pre className="be-mono apk-statements-preview">
{statementPreview(open)}
            </pre>
            <div className="apk-statements-sheet-actions">
              <button type="button" className="be-btn be-btn-secondary" onClick={() => setOpen(null)}>Close</button>
              <button type="button" className="be-btn be-btn-primary">
                <Download size={16} strokeWidth={1.5} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
