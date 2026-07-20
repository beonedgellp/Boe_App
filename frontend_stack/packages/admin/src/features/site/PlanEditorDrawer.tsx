import { useEffect, useState } from 'react';
import { apiRequest } from '@beonedge/client/services/_util.ts';
import Drawer from '../../layout/Drawer.tsx';
import { useToast } from '../../components/ToastProvider.tsx';
import { TextField, TextAreaField, SelectField, CheckboxField, ListEditor, StatusBadge } from './fields.tsx';
import { formatRupeesFromPaise, parseRupeesToPaise } from '../../helpers/currency.ts';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CADENCE_OPTIONS = [
  { value: 'one_time', label: 'One time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

function planToForm(plan) {
  return {
    slug: plan?.slug || '',
    name: plan?.name || '',
    tagline: plan?.tagline || '',
    price: plan?.pricePaise !== undefined && plan?.pricePaise !== null ? String(plan.pricePaise / 100) : '',
    cadence: plan?.cadence || 'one_time',
    features: Array.isArray(plan?.features) ? plan.features : [],
    ctaLabel: plan?.ctaLabel || 'Get started',
    featured: Boolean(plan?.featured),
    sortOrder: plan?.sortOrder ?? 0,
  };
}

function validateForm(form) {
  const errors = {};
  if (!form.slug.trim()) errors.slug = 'Slug is required.';
  else if (!SLUG_PATTERN.test(form.slug.trim())) errors.slug = 'Use lowercase letters, numbers, and hyphens.';
  if (!form.name.trim()) errors.name = 'Name is required.';
  if (!form.tagline.trim()) errors.tagline = 'Tagline is required.';
  const paise = parseRupeesToPaise(form.price);
  if (paise === null || Number.isNaN(paise)) errors.price = 'Enter a valid amount in rupees.';
  return errors;
}

function formToPayload(form) {
  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    tagline: form.tagline.trim(),
    pricePaise: parseRupeesToPaise(form.price),
    cadence: form.cadence,
    features: form.features.map((item) => item.trim()).filter(Boolean),
    ctaLabel: form.ctaLabel.trim() || 'Get started',
    featured: form.featured,
    sortOrder: Number(form.sortOrder) || 0,
  };
}

export default function PlanEditorDrawer({ open, plan, plans, onClose, onSaved }) {
  const isNew = !plan?.id;
  const [form, setForm] = useState(planToForm(plan));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    setForm(planToForm(plan));
    setErrors({});
    setConfirmArchive(false);
  }, [plan, open]);

  const otherFeatured = (plans || []).find((item) => item.featured && item.id !== plan?.id && item.status !== 'archived');
  const featuredWarning = form.featured && otherFeatured
    ? `${otherFeatured.name} is already featured. The landing page highlights one plan; consider unfeaturing it.`
    : '';

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function run(action, successMessage, { keepOpen = false } = {}) {
    setBusy(true);
    try {
      await action();
      addToast(successMessage, 'success');
      onSaved();
      if (!keepOpen) onClose();
    } catch (error) {
      addToast(error?.message || 'Action failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = formToPayload(form);
    if (isNew) {
      await run(
        () => apiRequest('/v1/admin/plans', { method: 'POST', body: payload, scope: 'admin' }),
        `${payload.name} created as a draft.`,
      );
    } else {
      await run(
        () => apiRequest(`/v1/admin/plans/${encodeURIComponent(plan.id)}`, { method: 'PATCH', body: payload, scope: 'admin' }),
        `${payload.name} saved.`,
        { keepOpen: true },
      );
    }
  }

  async function handleStatusChange(status) {
    await run(
      () => apiRequest(`/v1/admin/plans/${encodeURIComponent(plan.id)}`, { method: 'PATCH', body: { status }, scope: 'admin' }),
      status === 'published' ? `${plan.name} is now live on the landing page.` : `${plan.name} moved to draft.`,
    );
  }

  async function handleArchive() {
    if (!confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    await run(
      () => apiRequest(`/v1/admin/plans/${encodeURIComponent(plan.id)}`, { method: 'DELETE', scope: 'admin' }),
      `${plan.name} archived.`,
    );
  }

  const footer = (
    <>
      {!isNew && plan.status !== 'archived' && (
        <button type="button" className="ash-btn ash-btn-danger ash-btn-sm" onClick={handleArchive} disabled={busy}>
          {confirmArchive ? 'Confirm archive' : 'Archive'}
        </button>
      )}
      <span className="ash-drawer-foot-note">
        {!isNew && <StatusBadge status={plan.status} />}
      </span>
      {!isNew && plan.status === 'draft' && (
        <button type="button" className="ash-btn ash-btn-secondary" onClick={() => handleStatusChange('published')} disabled={busy}>
          Publish
        </button>
      )}
      {!isNew && plan.status === 'published' && (
        <button type="button" className="ash-btn ash-btn-secondary" onClick={() => handleStatusChange('draft')} disabled={busy}>
          Move to draft
        </button>
      )}
      {!isNew && plan.status === 'archived' && (
        <button type="button" className="ash-btn ash-btn-secondary" onClick={() => handleStatusChange('draft')} disabled={busy}>
          Restore as draft
        </button>
      )}
      <button type="button" className={`ash-btn ash-btn-primary ${busy ? 'is-loading' : ''}`} onClick={handleSave} disabled={busy}>
        {isNew ? 'Create plan' : 'Save changes'}
      </button>
    </>
  );

  return (
    <Drawer open={open} title={isNew ? 'New plan' : plan?.name || 'Edit plan'} onClose={busy ? () => {} : onClose} footer={footer}>
      <TextField label="Name" value={form.name} onChange={(v) => setField('name', v)} required error={errors.name} placeholder="Premium" />
      <TextField label="Slug" value={form.slug} onChange={(v) => setField('slug', v)} required error={errors.slug} help="Lowercase letters, numbers, and hyphens." placeholder="premium-monthly" />
      <TextAreaField label="Tagline" value={form.tagline} onChange={(v) => setField('tagline', v)} required error={errors.tagline} rows={2} help="One line shown under the plan name." />
      <div className="ash-form-row">
        <TextField label="Price (rupees)" value={form.price} onChange={(v) => setField('price', v)} required error={errors.price} help={form.price && !errors.price ? `Shown as ${formatRupeesFromPaise(parseRupeesToPaise(form.price))}` : undefined} placeholder="299" />
        <SelectField label="Billing cadence" value={form.cadence} onChange={(v) => setField('cadence', v)} options={CADENCE_OPTIONS} />
      </div>
      <ListEditor
        label="Features"
        items={form.features}
        onChange={(v) => setField('features', v)}
        placeholder="Weekly live Q&A sessions"
        addLabel="Add feature"
      />
      <div className="ash-form-row">
        <TextField label="Button label" value={form.ctaLabel} onChange={(v) => setField('ctaLabel', v)} help="Verb plus object, for example: Start Premium." />
        <TextField label="Sort order" type="number" value={form.sortOrder} onChange={(v) => setField('sortOrder', v)} help="Lower numbers appear first." />
      </div>
      <CheckboxField label="Feature this plan" checked={form.featured} onChange={(v) => setField('featured', v)} help="The landing page visually highlights the featured plan." />
      {featuredWarning && <div className="ash-warning-note" role="status">{featuredWarning}</div>}
    </Drawer>
  );
}
