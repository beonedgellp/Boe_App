import { TextField, TextAreaField, ListEditor } from '../fields.tsx';

export default function LeadFormSection({ value, onChange }) {
  const leadForm = value || {};
  const set = (field, fieldValue) => onChange({ ...leadForm, [field]: fieldValue });

  return (
    <div className="ash-card">
      <TextField label="Eyebrow" value={leadForm.eyebrow} onChange={(v) => set('eyebrow', v)} tooltip="Small label above the lead form heading." />
      <TextField label="Title" value={leadForm.title} onChange={(v) => set('title', v)} tooltip="Heading of the lead-capture form on the home page." />
      <TextAreaField label="Lead" value={leadForm.lead} onChange={(v) => set('lead', v)} rows={3} tooltip="Short paragraph explaining why the visitor should fill out the form." />
      <div className="ash-form-row">
        <TextField label="Submit button label" value={leadForm.submitLabel} onChange={(v) => set('submitLabel', v)} help="Verb plus object, for example: Request course details." tooltip="Text on the submit button." />
      </div>
      <TextAreaField label="Success message" value={leadForm.successMessage} onChange={(v) => set('successMessage', v)} rows={2} help="Shown after the form is submitted." tooltip="Message shown after the form is submitted successfully." />
      <ListEditor
        label="Interest options"
        items={leadForm.interestOptions}
        onChange={(v) => set('interestOptions', v)}
        placeholder="Premium membership"
        max={10}
        addLabel="Add option"
        tooltip="Dropdown options for 'What are you interested in?'. These populate the lead-form select field."
      />
    </div>
  );
}
