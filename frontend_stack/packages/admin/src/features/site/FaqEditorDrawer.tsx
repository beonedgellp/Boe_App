import { useEffect, useState } from 'react';
import { apiRequest } from '@beonedge/client/services/_util';
import Drawer from '../../layout/Drawer';
import { useToast } from '../../components/ToastProvider';
import { TextField, TextAreaField, StatusBadge } from './fields';

function faqToForm(faq) {
  return {
    question: faq?.question || '',
    answer: faq?.answer || '',
    category: faq?.category || 'general',
    order: faq?.order ?? 0,
  };
}

function validateForm(form) {
  const errors: any = {};
  if (!form.question.trim()) errors.question = 'Question is required.';
  if (!form.answer.trim()) errors.answer = 'Answer is required.';
  return errors;
}

export default function FaqEditorDrawer({ open, faq, onClose, onSaved }: any) {
  const isNew = !faq?.id;
  const [form, setForm] = useState(faqToForm(faq));
  const [errors, setErrors] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    setForm(faqToForm(faq));
    setErrors({});
    setConfirmDelete(false);
  }, [faq, open]);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function run(action, successMessage, { keepOpen = false }: any = {}) {
    setBusy(true);
    try {
      await action();
      addToast(successMessage, 'success');
      onSaved();
      if (!keepOpen) onClose();
    } catch (error) {
      addToast((error as any)?.message || 'Action failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function formToPayload() {
    return {
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category.trim() || 'general',
      order: Number(form.order) || 0,
    };
  }

  async function handleSave() {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (isNew) {
      await run(
        () => apiRequest('/v1/admin/faqs', { method: 'POST', body: formToPayload(), scope: 'admin' }),
        'FAQ created as a draft.',
      );
    } else {
      await run(
        () => apiRequest(`/v1/admin/faqs/${encodeURIComponent(faq.id)}`, { method: 'PATCH', body: formToPayload(), scope: 'admin' }),
        'FAQ saved.',
        { keepOpen: true },
      );
    }
  }

  async function handleStatusChange(status) {
    await run(
      () => apiRequest(`/v1/admin/faqs/${encodeURIComponent(faq.id)}`, { method: 'PATCH', body: { status }, scope: 'admin' }),
      status === 'published' ? 'FAQ published.' : 'FAQ moved to draft.',
    );
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await run(
      () => apiRequest(`/v1/admin/faqs/${encodeURIComponent(faq.id)}`, { method: 'DELETE', scope: 'admin' }),
      'FAQ deleted.',
    );
  }

  const footer = (
    <>
      {!isNew && (
        <button type="button" className="ash-btn ash-btn-danger ash-btn-sm" onClick={handleDelete} disabled={busy}>
          {confirmDelete ? 'Confirm delete' : 'Delete'}
        </button>
      )}
      <span className="ash-drawer-foot-note">
        {!isNew && <StatusBadge status={(faq as any).status} />}
      </span>
      {!isNew && (faq as any).status !== 'published' && (
        <button type="button" className="ash-btn ash-btn-secondary" onClick={() => handleStatusChange('published')} disabled={busy}>
          Publish
        </button>
      )}
      {!isNew && (faq as any).status === 'published' && (
        <button type="button" className="ash-btn ash-btn-secondary" onClick={() => handleStatusChange('draft')} disabled={busy}>
          Move to draft
        </button>
      )}
      <button type="button" className={`ash-btn ash-btn-primary ${busy ? 'is-loading' : ''}`} onClick={handleSave} disabled={busy}>
        {isNew ? 'Create FAQ' : 'Save changes'}
      </button>
    </>
  );

  return (
    <Drawer open={open} title={isNew ? 'New FAQ' : 'Edit FAQ'} onClose={busy ? () => {} : onClose} footer={footer}>
      <TextField label="Question" value={form.question} onChange={(v) => setField('question', v)} required error={errors.question} placeholder="How do I reset my password?" />
      <TextAreaField label="Answer" value={form.answer} onChange={(v) => setField('answer', v)} required error={errors.answer} rows={5} />
      <div className="ash-form-row">
        <TextField label="Category" value={form.category} onChange={(v) => setField('category', v)} help="Used to group FAQs, for example: general, payments." />
        <TextField label="Sort order" type="number" value={form.order} onChange={(v) => setField('order', v)} help="Lower numbers appear first." />
      </div>
    </Drawer>
  );
}
