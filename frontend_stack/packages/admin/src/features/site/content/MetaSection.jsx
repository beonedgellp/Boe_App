import { TextField, TextAreaField } from '../fields.jsx';

export default function MetaSection({ value, onChange }) {
  const meta = value || {};
  const set = (field, fieldValue) => onChange({ ...meta, [field]: fieldValue });

  return (
    <div className="ash-card">
      <TextField label="Site name" value={meta.siteName} onChange={(v) => set('siteName', v)} required help="Always written in full; never abbreviated." />
      <TextField label="Descriptor" value={meta.descriptor} onChange={(v) => set('descriptor', v)} help="Short line used in the nav and footer." />
      <TextAreaField label="Long descriptor" value={meta.longDescriptor} onChange={(v) => set('longDescriptor', v)} rows={3} />
      <TextField label="Contact email" value={meta.contactEmail} onChange={(v) => set('contactEmail', v)} />
      <TextAreaField label="Disclaimer" value={meta.disclaimer} onChange={(v) => set('disclaimer', v)} rows={3} help="Mandatory educational disclaimer shown in the footer." />
    </div>
  );
}
