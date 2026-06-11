import { TextField, TextAreaField, ListEditor } from '../fields.jsx';

export default function LeadFormSection({ value, onChange }) {
  const leadForm = value || {};
  const set = (field, fieldValue) => onChange({ ...leadForm, [field]: fieldValue });

  return (
    <div className="ash-card">
      <TextField label="Eyebrow" value={leadForm.eyebrow} onChange={(v) => set('eyebrow', v)} />
      <TextField label="Title" value={leadForm.title} onChange={(v) => set('title', v)} />
      <TextAreaField label="Lead" value={leadForm.lead} onChange={(v) => set('lead', v)} rows={3} />
      <div className="ash-form-row">
        <TextField label="Submit button label" value={leadForm.submitLabel} onChange={(v) => set('submitLabel', v)} help="Verb plus object, for example: Request course details." />
      </div>
      <TextAreaField label="Success message" value={leadForm.successMessage} onChange={(v) => set('successMessage', v)} rows={2} help="Shown after the form is submitted." />
      <ListEditor
        label="Interest options"
        items={leadForm.interestOptions}
        onChange={(v) => set('interestOptions', v)}
        placeholder="Premium membership"
        max={10}
        addLabel="Add option"
      />
    </div>
  );
}
