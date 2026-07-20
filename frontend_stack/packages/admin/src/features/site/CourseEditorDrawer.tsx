import { useEffect, useState } from 'react';
import { apiRequest } from '@beonedge/client/services/_util.ts';
import Drawer from '../../layout/Drawer.tsx';
import { useToast } from '../../components/ToastProvider.tsx';
import { TextField, TextAreaField, StatusBadge } from './fields.tsx';
import { formatRupeesFromPaise, parseRupeesToPaise } from '../../helpers/currency.ts';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function courseToForm(course) {
  return {
    slug: course?.slug || '',
    name: course?.name || '',
    level: course?.level || '',
    format: course?.format || '',
    outcome: course?.outcome || '',
    description: course?.description || '',
    price: course?.pricePaise ? String(course.pricePaise / 100) : '',
    sortOrder: course?.sortOrder ?? 0,
  };
}

function validateForm(form) {
  const errors = {};
  if (!form.slug.trim()) errors.slug = 'Slug is required.';
  else if (!SLUG_PATTERN.test(form.slug.trim())) errors.slug = 'Use lowercase letters, numbers, and hyphens.';
  if (!form.name.trim()) errors.name = 'Name is required.';
  if (!form.level.trim()) errors.level = 'Level is required.';
  if (!form.format.trim()) errors.format = 'Format is required.';
  if (!form.outcome.trim()) errors.outcome = 'Outcome is required.';
  if (Number.isNaN(parseRupeesToPaise(form.price))) errors.price = 'Enter a valid amount in rupees.';
  return errors;
}

function formToPayload(form) {
  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    level: form.level.trim(),
    format: form.format.trim(),
    outcome: form.outcome.trim(),
    description: form.description.trim(),
    pricePaise: parseRupeesToPaise(form.price),
    sortOrder: Number(form.sortOrder) || 0,
  };
}

export default function CourseEditorDrawer({ open, course, onClose, onSaved }) {
  const isNew = !course?.id;
  const [form, setForm] = useState(courseToForm(course));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    setForm(courseToForm(course));
    setErrors({});
    setConfirmArchive(false);
  }, [course, open]);

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
        () => apiRequest('/v1/admin/courses', { method: 'POST', body: payload, scope: 'admin' }),
        `${payload.name} created as a draft.`,
      );
    } else {
      await run(
        () => apiRequest(`/v1/admin/courses/${encodeURIComponent(course.id)}`, { method: 'PATCH', body: payload, scope: 'admin' }),
        `${payload.name} saved.`,
        { keepOpen: true },
      );
    }
  }

  async function handleStatusChange(status) {
    await run(
      () => apiRequest(`/v1/admin/courses/${encodeURIComponent(course.id)}`, { method: 'PATCH', body: { status }, scope: 'admin' }),
      status === 'published' ? `${course.name} is now live on the landing page.` : `${course.name} moved to draft.`,
    );
  }

  async function handleArchive() {
    if (!confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    await run(
      () => apiRequest(`/v1/admin/courses/${encodeURIComponent(course.id)}`, { method: 'DELETE', scope: 'admin' }),
      `${course.name} archived.`,
    );
  }

  const footer = (
    <>
      {!isNew && course.status !== 'archived' && (
        <button type="button" className="ash-btn ash-btn-danger ash-btn-sm" onClick={handleArchive} disabled={busy}>
          {confirmArchive ? 'Confirm archive' : 'Archive'}
        </button>
      )}
      <span className="ash-drawer-foot-note">
        {!isNew && <StatusBadge status={course.status} />}
      </span>
      {!isNew && course.status === 'draft' && (
        <button type="button" className="ash-btn ash-btn-secondary" onClick={() => handleStatusChange('published')} disabled={busy}>
          Publish
        </button>
      )}
      {!isNew && course.status === 'published' && (
        <button type="button" className="ash-btn ash-btn-secondary" onClick={() => handleStatusChange('draft')} disabled={busy}>
          Move to draft
        </button>
      )}
      {!isNew && course.status === 'archived' && (
        <button type="button" className="ash-btn ash-btn-secondary" onClick={() => handleStatusChange('draft')} disabled={busy}>
          Restore as draft
        </button>
      )}
      <button type="button" className={`ash-btn ash-btn-primary ${busy ? 'is-loading' : ''}`} onClick={handleSave} disabled={busy}>
        {isNew ? 'Create course' : 'Save changes'}
      </button>
    </>
  );

  return (
    <Drawer open={open} title={isNew ? 'New course' : course?.name || 'Edit course'} onClose={busy ? () => {} : onClose} footer={footer}>
      <TextField label="Name" value={form.name} onChange={(v) => setField('name', v)} required error={errors.name} placeholder="Money Basics" />
      <TextField label="Slug" value={form.slug} onChange={(v) => setField('slug', v)} required error={errors.slug} help="Lowercase letters, numbers, and hyphens. Used in the course URL." placeholder="money-basics" />
      <div className="ash-form-row">
        <TextField label="Level" value={form.level} onChange={(v) => setField('level', v)} required error={errors.level} placeholder="Beginner" />
        <TextField label="Format" value={form.format} onChange={(v) => setField('format', v)} required error={errors.format} placeholder="6 lessons, self-paced" />
      </div>
      <TextAreaField label="Outcome" value={form.outcome} onChange={(v) => setField('outcome', v)} required error={errors.outcome} help="One sentence on what the learner walks away with." />
      <TextAreaField label="Description" value={form.description} onChange={(v) => setField('description', v)} rows={4} />
      <div className="ash-form-row">
        <TextField label="Price (rupees)" value={form.price} onChange={(v) => setField('price', v)} error={errors.price} help={form.price && !errors.price ? `Shown as ${formatRupeesFromPaise(parseRupeesToPaise(form.price))}` : 'Leave empty for a free course.'} placeholder="499" />
        <TextField label="Sort order" type="number" value={form.sortOrder} onChange={(v) => setField('sortOrder', v)} help="Lower numbers appear first." />
      </div>
    </Drawer>
  );
}
