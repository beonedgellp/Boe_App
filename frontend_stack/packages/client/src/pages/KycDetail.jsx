import React, { useEffect, useMemo, useState } from 'react';
import AppBar from '../layout/AppBar.jsx';
import { fetchKycStatus, updateKycDepth } from '../services/kycApi.js';

function formatDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function isMinor(dateOfBirth) {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age < 18;
}

export default function KycDetail() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  const [fatca, setFatca] = useState({ taxResidence: '', usPerson: false, tin: '', declarationDate: '' });
  const [nomineeForm, setNomineeForm] = useState({ name: '', relationship: '', dateOfBirth: '', percentage: '', guardianName: '' });
  const [nominees, setNominees] = useState([]);
  const [reKycDueDate, setReKycDueDate] = useState('');
  const [reKycTriggerReason, setReKycTriggerReason] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchKycStatus()
      .then((data) => {
        if (!mounted) return;
        setProfile(data);
        const decl = data.fatcaDeclaration || {};
        setFatca({
          taxResidence: decl.taxResidence || '',
          usPerson: decl.usPerson || false,
          tin: decl.tin || '',
          declarationDate: formatDateInput(decl.declarationDate),
        });
        setNominees(Array.isArray(data.nominees) ? data.nominees : []);
        setReKycDueDate(formatDateInput(data.reKycDueDate));
        setReKycTriggerReason(data.reKycTriggerReason || '');
      })
      .catch(() => setErr('Could not load KYC data.'))
      .finally(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  const nomineeTotal = useMemo(() => nominees.reduce((s, n) => s + (Number(n.percentage) || 0), 0), [nominees]);
  const canAddNominee = nominees.length < 3;
  const nomineeError = useMemo(() => {
    if (nominees.length > 0 && nomineeTotal !== 100) return `Total percentage must be 100% (currently ${nomineeTotal}%).`;
    if (!canAddNominee && nominees.length >= 3) return 'Maximum 3 nominees allowed.';
    return '';
  }, [nominees, nomineeTotal, canAddNominee]);

  async function onSaveFatca(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const payload = {
        fatcaStatus: fatca.usPerson ? 'pending' : 'completed',
        fatcaDeclaration: {
          taxResidence: fatca.taxResidence.trim(),
          usPerson: !!fatca.usPerson,
          tin: fatca.usPerson ? fatca.tin.trim() : '',
          declarationDate: fatca.declarationDate ? new Date(fatca.declarationDate).toISOString() : new Date().toISOString(),
        },
      };
      const updated = await updateKycDepth(payload);
      setProfile(updated);
      setToast('FATCA declaration saved.');
      setTimeout(() => setToast(''), 3000);
    } catch (error) {
      setErr(error?.message || 'Could not save FATCA declaration.');
    } finally {
      setSaving(false);
    }
  }

  function onAddNominee(e) {
    e.preventDefault();
    setErr('');
    const p = Number(nomineeForm.percentage);
    if (!nomineeForm.name.trim() || !nomineeForm.relationship.trim() || !nomineeForm.dateOfBirth || !p || p <= 0) {
      setErr('Please fill all nominee fields.');
      return;
    }
    if (isMinor(nomineeForm.dateOfBirth) && !nomineeForm.guardianName.trim()) {
      setErr('Guardian name is required for minor nominees.');
      return;
    }
    const nextTotal = nomineeTotal + p;
    if (nextTotal > 100) {
      setErr(`Nominee percentages must total 100%. Adding this would make it ${nextTotal}%.`);
      return;
    }
    if (nominees.length >= 3) {
      setErr('Maximum 3 nominees allowed.');
      return;
    }
    const next = {
      name: nomineeForm.name.trim(),
      relationship: nomineeForm.relationship.trim(),
      dateOfBirth: nomineeForm.dateOfBirth,
      percentage: p,
      guardianName: isMinor(nomineeForm.dateOfBirth) ? nomineeForm.guardianName.trim() : null,
    };
    const updatedNominees = [...nominees, next];
    setNominees(updatedNominees);
    setNomineeForm({ name: '', relationship: '', dateOfBirth: '', percentage: '', guardianName: '' });
  }

  function removeNominee(index) {
    setNominees((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSaveNominees(e) {
    e.preventDefault();
    setErr('');
    if (nominees.length > 0 && nomineeTotal !== 100) {
      setErr(`Nominee percentages must total 100%. Current total: ${nomineeTotal}%.`);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateKycDepth({ nominees });
      setProfile(updated);
      setToast('Nominees saved.');
      setTimeout(() => setToast(''), 3000);
    } catch (error) {
      setErr(error?.message || 'Could not save nominees.');
    } finally {
      setSaving(false);
    }
  }

  async function onSaveReKyc(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const payload = {
        reKycDueDate: reKycDueDate ? new Date(reKycDueDate).toISOString() : null,
        reKycTriggerReason: reKycTriggerReason || null,
      };
      const updated = await updateKycDepth(payload);
      setProfile(updated);
      setToast('Re-KYC data saved.');
      setTimeout(() => setToast(''), 3000);
    } catch (error) {
      setErr(error?.message || 'Could not save Re-KYC data.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <AppBar title="KYC & Compliance" />
        <div className="apk-screen">
          <div className="be-card apk-card-p-24">
            <div className="apk-skel apk-skel--h-20 apk-skel--w-60 apk-skel--mb-16" />
            <div className="apk-skel apk-skel--h-14 apk-skel--w-40" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar title="KYC & Compliance" />
      <div className="apk-screen">
        {err && (
          <div className="apk-banner apk-banner-red" role="alert">
            {err}
          </div>
        )}

        {/* FATCA */}
        <div className="be-card apk-card-no-pad">
          <div className="apk-kyc-header">
            <div className="be-eyebrow">FATCA</div>
            <div className="apk-kyc-status">
              Status: <span className={`be-badge ${profile?.fatcaStatus === 'completed' ? 'be-badge-active' : 'be-badge-paused'}`}>{profile?.fatcaStatus || 'not_started'}</span>
            </div>
          </div>
          <form onSubmit={onSaveFatca} className="apk-kyc-form">
            <div className="be-field">
              <label>Tax residence</label>
              <input
                className="be-input"
                value={fatca.taxResidence}
                onChange={(e) => setFatca((f) => ({ ...f, taxResidence: e.target.value }))}
                placeholder="e.g. India"
                required
              />
            </div>
            <div className="be-field">
              <label>US person</label>
              <select
                className="be-input"
                value={fatca.usPerson ? 'yes' : 'no'}
                onChange={(e) => setFatca((f) => ({ ...f, usPerson: e.target.value === 'yes' }))}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            {fatca.usPerson && (
              <div className="be-field">
                <label>TIN (Taxpayer Identification Number)</label>
                <input
                  className="be-input"
                  value={fatca.tin}
                  onChange={(e) => setFatca((f) => ({ ...f, tin: e.target.value }))}
                  placeholder="e.g. 123-45-6789"
                  required
                />
              </div>
            )}
            <div className="be-field">
              <label>Declaration date</label>
              <input
                className="be-input"
                type="date"
                value={fatca.declarationDate}
                onChange={(e) => setFatca((f) => ({ ...f, declarationDate: e.target.value }))}
                required
              />
            </div>
            <button type="submit" className="be-btn be-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save FATCA declaration'}
            </button>
          </form>
        </div>

        {/* Nominees */}
        <div className="be-card apk-card-no-pad">
          <div className="apk-kyc-header">
            <div className="be-eyebrow">Nominees</div>
            <div className="apk-kyc-meta">
              Total allocation: <strong>{nomineeTotal}%</strong> · {nominees.length}/3 added
            </div>
            {nomineeError && (
              <div className="apk-kyc-meta apk-kyc-meta--error">{nomineeError}</div>
            )}
          </div>

          {nominees.length > 0 && (
            <div className="apk-kyc-list">
              {nominees.map((n, i) => (
                <div key={i} className="apk-list-row apk-nominee-row">
                  <div>
                    <div className="apk-list-l">{n.name}</div>
                    <div className="apk-list-meta">
                      {n.relationship} · {n.percentage}% · DOB {formatDateInput(n.dateOfBirth)}
                      {n.guardianName ? ` · Guardian: ${n.guardianName}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="be-btn be-btn-sm be-btn-danger"
                    onClick={() => removeNominee(i)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {canAddNominee && (
            <form onSubmit={onAddNominee} className="apk-kyc-form apk-kyc-form--bordered">
              <div className="auth-field-row">
                <div className="be-field">
                  <label>Name</label>
                  <input
                    className="be-input"
                    value={nomineeForm.name}
                    onChange={(e) => setNomineeForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Nominee name"
                  />
                </div>
                <div className="be-field">
                  <label>Relationship</label>
                  <input
                    className="be-input"
                    value={nomineeForm.relationship}
                    onChange={(e) => setNomineeForm((f) => ({ ...f, relationship: e.target.value }))}
                    placeholder="e.g. Spouse"
                  />
                </div>
              </div>
              <div className="auth-field-row">
                <div className="be-field">
                  <label>Date of birth</label>
                  <input
                    className="be-input"
                    type="date"
                    value={nomineeForm.dateOfBirth}
                    onChange={(e) => setNomineeForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div className="be-field">
                  <label>Percentage (%)</label>
                  <input
                    className="be-input"
                    type="number"
                    min={1}
                    max={100}
                    value={nomineeForm.percentage}
                    onChange={(e) => setNomineeForm((f) => ({ ...f, percentage: e.target.value }))}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>
              {isMinor(nomineeForm.dateOfBirth) && (
                <div className="be-field">
                  <label>Guardian name (minor)</label>
                  <input
                    className="be-input"
                    value={nomineeForm.guardianName}
                    onChange={(e) => setNomineeForm((f) => ({ ...f, guardianName: e.target.value }))}
                    placeholder="Guardian name"
                  />
                </div>
              )}
              <button type="submit" className="be-btn be-btn-secondary">
                Add nominee
              </button>
            </form>
          )}

          <div className="apk-kyc-footer">
            <button
              className="be-btn be-btn-primary be-btn-block"
              disabled={saving || nominees.length === 0 || nomineeTotal !== 100}
              onClick={onSaveNominees}
            >
              {saving ? 'Saving…' : 'Save nominees'}
            </button>
          </div>
        </div>

        {/* Re-KYC */}
        <div className="be-card apk-card-no-pad">
          <div className="apk-kyc-header">
            <div className="be-eyebrow">Re-KYC</div>
          </div>
          <form onSubmit={onSaveReKyc} className="apk-kyc-form">
            <div className="be-field">
              <label>Re-KYC due date</label>
              <input
                className="be-input"
                type="date"
                value={reKycDueDate}
                onChange={(e) => setReKycDueDate(e.target.value)}
              />
            </div>
            <div className="be-field">
              <label>Trigger reason</label>
              <select
                className="be-input"
                value={reKycTriggerReason}
                onChange={(e) => setReKycTriggerReason(e.target.value)}
              >
                <option value="">Select reason…</option>
                <option value="annual_review">Annual review</option>
                <option value="address_change">Address change</option>
                <option value="pan_update">PAN update</option>
                <option value="nominee_change">Nominee change</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button type="submit" className="be-btn be-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Re-KYC'}
            </button>
          </form>
        </div>

        {toast && <div className="apk-toast" role="status" aria-live="polite">{toast}</div>}
      </div>
    </>
  );
}
