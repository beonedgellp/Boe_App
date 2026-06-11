import { useId } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import I from '../../components/I.jsx';
import HelpTooltip from '../../components/HelpTooltip.jsx';

// Shared form primitives for the Site Control pages. Labels sit above
// inputs; help text is optional; error text renders below the input.

export function TextField({ label, value, onChange, placeholder, help, error, required, type = 'text', disabled, tooltip }) {
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const describedBy = [help && !error ? helpId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ash-field">
      <label className="ash-label" htmlFor={inputId}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
        {tooltip && <HelpTooltip text={tooltip} />}
      </label>
      <input
        id={inputId}
        type={type}
        className={`ash-input ${error ? 'is-invalid' : ''}`}
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
      {help && !error && <span id={helpId} className="ash-help">{help}</span>}
      {error && <span id={errorId} className="ash-error-text">{error}</span>}
    </div>
  );
}

export function TextAreaField({ label, value, onChange, placeholder, help, error, required, rows = 3, disabled, tooltip }) {
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const describedBy = [help && !error ? helpId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ash-field">
      <label className="ash-label" htmlFor={inputId}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
        {tooltip && <HelpTooltip text={tooltip} />}
      </label>
      <textarea
        id={inputId}
        className={`ash-textarea ${error ? 'is-invalid' : ''}`}
        value={value ?? ''}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
      {help && !error && <span id={helpId} className="ash-help">{help}</span>}
      {error && <span id={errorId} className="ash-error-text">{error}</span>}
    </div>
  );
}

export function SelectField({ label, value, onChange, options, help, error, disabled, tooltip }) {
  return (
    <div className="ash-field">
      <label className="ash-label">
        {label}
        {tooltip && <HelpTooltip text={tooltip} />}
      </label>
      <select
        className={`ash-select ${error ? 'is-invalid' : ''}`}
        value={value ?? ''}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {help && !error && <span className="ash-help">{help}</span>}
      {error && <span className="ash-error-text">{error}</span>}
    </div>
  );
}

export function CheckboxField({ label, checked, onChange, help, disabled, tooltip }) {
  return (
    <div className="ash-field">
      <label className="ash-check">
        <input
          type="checkbox"
          checked={Boolean(checked)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{label}</span>
        {tooltip && <HelpTooltip text={tooltip} />}
      </label>
      {help && <span className="ash-help">{help}</span>}
    </div>
  );
}

// Generic editable string list with add, remove, and reorder. `max`
// disables the add action once reached.
export function ListEditor({ label, items, onChange, placeholder, max, addLabel = 'Add item', help, tooltip }) {
  const list = Array.isArray(items) ? items : [];

  function updateAt(index, value) {
    onChange(list.map((item, i) => (i === index ? value : item)));
  }

  function removeAt(index) {
    onChange(list.filter((_, i) => i !== index));
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  }

  return (
    <div className="ash-field">
      <span className="ash-label">
        {label}
        {tooltip && <HelpTooltip text={tooltip} />}
      </span>
      {help && <span className="ash-help">{help}</span>}
      <div className="ash-list-editor">
        {list.map((item, index) => (
          <div className="ash-list-editor-row" key={index}>
            <input
              className="ash-input"
              value={item ?? ''}
              placeholder={placeholder}
              onChange={(event) => updateAt(index, event.target.value)}
            />
            <button type="button" className="ash-icon-btn ash-icon-btn--sm" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
              <I icon={ArrowUp} size={13} />
            </button>
            <button type="button" className="ash-icon-btn ash-icon-btn--sm" onClick={() => move(index, 1)} disabled={index === list.length - 1} aria-label="Move down">
              <I icon={ArrowDown} size={13} />
            </button>
            <button type="button" className="ash-icon-btn ash-icon-btn--sm" onClick={() => removeAt(index)} aria-label="Remove item">
              <I icon={Trash2} size={13} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="ash-btn ash-btn-ghost ash-btn-sm"
          onClick={() => onChange([...list, ''])}
          disabled={max !== undefined && list.length >= max}
        >
          <I icon={Plus} size={13} />
          {addLabel}
        </button>
      </div>
    </div>
  );
}

// Label + href pair for CTAs and nav links.
export function LinkField({ label, value, onChange, hrefHelp, tooltip }) {
  const link = value || { label: '', href: '' };
  return (
    <div className="ash-field">
      <span className="ash-label">
        {label}
        {tooltip && <HelpTooltip text={tooltip} />}
      </span>
      <div className="ash-form-row">
        <input
          className="ash-input"
          value={link.label ?? ''}
          placeholder="Label"
          aria-label={`${label} label`}
          onChange={(event) => onChange({ ...link, label: event.target.value })}
        />
        <input
          className="ash-input"
          value={link.href ?? ''}
          placeholder="/courses"
          aria-label={`${label} destination`}
          onChange={(event) => onChange({ ...link, href: event.target.value })}
        />
      </div>
      <span className="ash-help">{hrefHelp || 'Destination must start with /, #, or https://'}</span>
    </div>
  );
}

// Editable list of objects (testimonials, tiles, steps). `itemFields`
// describes the inputs per row; `newItem` builds an empty entry.
export function ObjectListEditor({ label, items, onChange, itemFields, newItem, max, addLabel = 'Add item', itemTitle, tooltip }) {
  const list = Array.isArray(items) ? items : [];

  function updateAt(index, field, value) {
    onChange(list.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function removeAt(index) {
    onChange(list.filter((_, i) => i !== index));
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  }

  return (
    <div className="ash-field">
      <span className="ash-label">
        {label}
        {tooltip && <HelpTooltip text={tooltip} />}
      </span>
      <div className="ash-objlist">
        {list.map((item, index) => (
          <div className="ash-objlist-item" key={index}>
            <div className="ash-objlist-head">
              <span className="ash-objlist-title">{itemTitle ? itemTitle(item, index) : `Item ${index + 1}`}</span>
              <span className="ash-objlist-controls">
                <button type="button" className="ash-icon-btn ash-icon-btn--sm" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                  <I icon={ArrowUp} size={13} />
                </button>
                <button type="button" className="ash-icon-btn ash-icon-btn--sm" onClick={() => move(index, 1)} disabled={index === list.length - 1} aria-label="Move down">
                  <I icon={ArrowDown} size={13} />
                </button>
                <button type="button" className="ash-icon-btn ash-icon-btn--sm" onClick={() => removeAt(index)} aria-label="Remove item">
                  <I icon={Trash2} size={13} />
                </button>
              </span>
            </div>
            {itemFields.map((field) => (
              field.type === 'textarea' ? (
                <textarea
                  key={field.key}
                  className="ash-textarea"
                  rows={2}
                  value={item[field.key] ?? ''}
                  placeholder={field.placeholder || field.label}
                  aria-label={field.label}
                  onChange={(event) => updateAt(index, field.key, event.target.value)}
                />
              ) : field.type === 'select' ? (
                <select
                  key={field.key}
                  className="ash-select"
                  value={item[field.key] ?? ''}
                  aria-label={field.label}
                  onChange={(event) => updateAt(index, field.key, event.target.value)}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  key={field.key}
                  className="ash-input"
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={item[field.key] ?? ''}
                  placeholder={field.placeholder || field.label}
                  aria-label={field.label}
                  onChange={(event) => updateAt(
                    index,
                    field.key,
                    field.type === 'number' ? Number(event.target.value) : event.target.value,
                  )}
                />
              )
            ))}
          </div>
        ))}
        <button
          type="button"
          className="ash-btn ash-btn-ghost ash-btn-sm"
          onClick={() => onChange([...list, newItem()])}
          disabled={max !== undefined && list.length >= max}
        >
          <I icon={Plus} size={13} />
          {addLabel}
        </button>
      </div>
    </div>
  );
}

const STATUS_BADGE_CLASS = {
  published: 'ash-badge-published',
  draft: 'ash-badge-draft',
  archived: 'ash-badge-archived',
};

export function StatusBadge({ status }) {
  const normalized = String(status || 'draft').toLowerCase();
  const tone = STATUS_BADGE_CLASS[normalized] || 'ash-badge-neutral';
  return <span className={`ash-badge ${tone}`}>{normalized}</span>;
}

export function StatusFilterChips({ value, onChange, options }) {
  return (
    <div className="ash-chip-row" role="group" aria-label="Filter by status">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`ash-chip ${value === option.value ? 'is-active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
