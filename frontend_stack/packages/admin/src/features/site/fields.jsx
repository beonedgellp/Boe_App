import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import I from '../../components/I.jsx';

// Shared form primitives for the Site Control pages. Labels sit above
// inputs; help text is optional; error text renders below the input.

export function TextField({ label, value, onChange, placeholder, help, error, required, type = 'text', disabled }) {
  return (
    <div className="ash-field">
      <label className="ash-label">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        type={type}
        className={`ash-input ${error ? 'is-invalid' : ''}`}
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      {help && !error && <span className="ash-help">{help}</span>}
      {error && <span className="ash-error-text">{error}</span>}
    </div>
  );
}

export function TextAreaField({ label, value, onChange, placeholder, help, error, required, rows = 3, disabled }) {
  return (
    <div className="ash-field">
      <label className="ash-label">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <textarea
        className={`ash-textarea ${error ? 'is-invalid' : ''}`}
        value={value ?? ''}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      {help && !error && <span className="ash-help">{help}</span>}
      {error && <span className="ash-error-text">{error}</span>}
    </div>
  );
}

export function SelectField({ label, value, onChange, options, help, disabled }) {
  return (
    <div className="ash-field">
      <label className="ash-label">{label}</label>
      <select
        className="ash-select"
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {help && <span className="ash-help">{help}</span>}
    </div>
  );
}

export function CheckboxField({ label, checked, onChange, help, disabled }) {
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
      </label>
      {help && <span className="ash-help">{help}</span>}
    </div>
  );
}

// Generic editable string list with add, remove, and reorder. `max`
// disables the add action once reached.
export function ListEditor({ label, items, onChange, placeholder, max, addLabel = 'Add item', help }) {
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
      <span className="ash-label">{label}</span>
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
            <button type="button" className="ash-icon-btn" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
              <I icon={ArrowUp} size={13} />
            </button>
            <button type="button" className="ash-icon-btn" onClick={() => move(index, 1)} disabled={index === list.length - 1} aria-label="Move down">
              <I icon={ArrowDown} size={13} />
            </button>
            <button type="button" className="ash-icon-btn" onClick={() => removeAt(index)} aria-label="Remove item">
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
